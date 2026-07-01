"""
快速多层检索编排器（v2 — 并行 + L1 短路）
===========================================
替代旧 MultiLayerRetriever 的"顺序兜底"逻辑。

核心差异：
  旧架构: L1 顺序 → 命中早退 | 否则 L2 → 仍不足 L3
  新架构: L1 ‖ L2 ‖ L3 三路并发，L1 先到先回（短路）

时序（hedged request）：
  t=0    L1/L2/L3 同时发出
  t≈10ms L1 返回 → 距离≤阈值 & ≥min条数 → ✅ 立即返回，忽略 L2/L3
  t≈150ms L1 未命中或超时 → 等 L2+L3 gather → merge 去重排序 → 返回

L4 (Web) 兜底：仅当 L1+L2+L3 合并仍不足 top_k 时触发。
"""
import asyncio
import time
from langchain_core.documents import Document
import config


class FastMultiLayerRetriever:
    def __init__(
        self,
        l1_retriever=None,     # RetrieverService — kb_l1_faq
        l2_retriever=None,     # RetrieverService — kb_l2_core
        l3_retriever=None,     # RetrieverService — kb_l3_books
        web_client=None,       # WebSearchClient | None
    ):
        self.l1 = l1_retriever
        self.l2 = l2_retriever
        self.l3 = l3_retriever
        self.web = web_client

    # ── 公开 API：与旧 MultiLayerRetriever.search() 签名兼容 ──

    def search(self, query: str, top_k: int = 5, domain: str = None,
               fast_path: bool = None) -> dict:
        """同步入口（FastAPI 调用）。内部用 asyncio 跑并行。"""
        if fast_path is None:
            fast_path = config.FAST_PATH

        if not fast_path:
            return self._search_legacy(query, top_k, domain)

        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # 在已有 event loop 中（理论上 FastAPI 默认没有，
                # 但 uvicorn 某些配置可能已有），用 run_until_complete 不安全
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    future = pool.submit(asyncio.run, self._search_async(query, top_k, domain))
                    return future.result(timeout=10)
            else:
                return asyncio.run(self._search_async(query, top_k, domain))
        except RuntimeError:
            return asyncio.run(self._search_async(query, top_k, domain))

    # ── 异步核心 ──

    async def _search_async(self, query: str, top_k: int, domain: str) -> dict:
        combined: list[Document] = []
        l1_hit = False
        l1_dist = 999.0
        t0 = time.time()
        latencies: dict[str, float] = {}

        # ── 并发发起三路 ──
        tasks = {
            "l1": asyncio.create_task(self._query_l1(query, top_k)),
            "l2": asyncio.create_task(self._query_l2(query, top_k, domain)),
            "l3": asyncio.create_task(self._query_l3(query, top_k, domain)),
        }

        # ── L1 短路：设超时，先到先得 ──
        if tasks["l1"] is not None:
            try:
                l1_docs, l1_dist = await asyncio.wait_for(
                    tasks["l1"], timeout=config.L1_WAIT_MS / 1000.0
                )
                latencies["l1"] = (time.time() - t0) * 1000

                # 判断 L1 是否命中
                if l1_dist <= config.L1_FAST_THRESHOLD and len(l1_docs) >= config.L1_MIN_RESULTS:
                    # ✅ L1 快路命中！
                    l1_hit = True
                    combined = l1_docs[:top_k]
                    print(f"[FastMulti] L1 FAST HIT: {len(l1_docs)} docs, best_dist={l1_dist:.4f}, "
                          f"latency={latencies['l1']:.0f}ms")

                    # 后台等 L2/L3 完成（用于日志观测，不阻塞返回）
                    asyncio.create_task(self._log_remaining(tasks, latencies, t0))
                    return self._format(combined, layer=1, fast_path_hit=True,
                                       latencies=latencies)

                # L1 未命中（距离 > 阈值 或 条数不足）
                combined.extend(l1_docs)
                print(f"[FastMulti] L1 miss: {len(l1_docs)} docs, best_dist={l1_dist:.4f}, "
                      f"waiting for L2+L3...")

            except asyncio.TimeoutError:
                latencies["l1"] = config.L1_WAIT_MS
                print(f"[FastMulti] L1 timeout after {config.L1_WAIT_MS}ms")
        else:
            latencies["l1"] = -1

        # ── L1 未命中 → 等 L2 + L3 并行 ──
        l2_results = await tasks["l2"] if tasks["l2"] else ([], 999)
        latencies["l2"] = (time.time() - t0) * 1000

        l3_results = await tasks["l3"] if tasks["l3"] else ([], 999)
        latencies["l3"] = (time.time() - t0) * 1000

        l2_docs, _ = l2_results
        l3_docs, _ = l3_results

        # 合并去重（L2 优先于 L3，因为更贴近"生活化减脂"场景）
        seen_texts = {d.page_content[:120] for d in combined}
        for doc in l2_docs:
            if doc.page_content[:120] not in seen_texts:
                combined.append(doc)
                seen_texts.add(doc.page_content[:120])
        for doc in l3_docs:
            if doc.page_content[:120] not in seen_texts:
                combined.append(doc)
                seen_texts.add(doc.page_content[:120])

        source_layer = 2  # L1 未命中时，主源为 L2

        # ── L4 Web 兜底 ──
        if len(combined) < top_k and self.web and config.USE_WEB_SEARCH:
            print(f"[FastMulti] L1-L3 only {len(combined)} docs, trying L4 web...")
            try:
                web_docs = self.web.search(query, top_k=top_k)
                for doc in web_docs:
                    if doc.page_content[:120] not in seen_texts:
                        combined.append(doc)
                        seen_texts.add(doc.page_content[:120])
                source_layer = 4
            except Exception as exc:
                print(f"[FastMulti] L4 web error: {exc}")

        latencies["total"] = (time.time() - t0) * 1000
        print(f"[FastMulti] Return {min(len(combined), top_k)} docs from layer {source_layer}, "
              f"L1={latencies.get('l1',-1):.0f}ms L2={latencies.get('l2',-1):.0f}ms "
              f"L3={latencies.get('l3',-1):.0f}ms total={latencies['total']:.0f}ms")

        return self._format(combined[:top_k] if combined else [],
                           layer=source_layer, fast_path_hit=False,
                           latencies=latencies)

    # ── 单层查询（返回 (docs, best_distance)） ──

    async def _query_l1(self, query: str, top_k: int):
        if not self.l1:
            return ([], 999)
        try:
            candidates = self.l1.search_with_score(query, top_k=top_k * 2)
            good = [(d, s) for d, s in candidates if s <= config.L1_FAST_THRESHOLD]
            best_dist = good[0][1] if good else (candidates[0][1] if candidates else 999)
            return ([d for d, _ in good], best_dist)
        except Exception as exc:
            print(f"[FastMulti] L1 query error: {exc}")
            return ([], 999)

    async def _query_l2(self, query: str, top_k: int, domain: str):
        if not self.l2:
            return ([], 999)
        try:
            docs = self.l2.search(query, top_k=top_k, domain=domain)
            return (docs, 999)  # L2 不做硬阈值过滤
        except Exception as exc:
            print(f"[FastMulti] L2 query error: {exc}")
            return ([], 999)

    async def _query_l3(self, query: str, top_k: int, domain: str):
        if not self.l3:
            return ([], 999)
        try:
            docs = self.l3.search(query, top_k=top_k, domain=domain)
            return (docs, 999)
        except Exception as exc:
            print(f"[FastMulti] L3 query error: {exc}")
            return ([], 999)

    # ── 兼容旧顺序逻辑（fast_path=false 时） ──

    def _search_legacy(self, query: str, top_k: int, domain: str) -> dict:
        """回退到旧的顺序兜底逻辑。"""
        combined = []
        l1_used = False

        if self.l1:
            try:
                candidates = self.l1.search_with_score(query, top_k=top_k * 2)
                good = [(d, s) for d, s in candidates if s <= config.SIMILARITY_THRESHOLD]
                if len(good) > 0:
                    combined.extend([d for d, _ in good])
                    l1_used = True
                    if len(combined) >= top_k:
                        return self._format(combined[:top_k], layer=1, fast_path_hit=False, latencies={})
            except Exception as exc:
                print(f"[FastMulti/Legacy] L1 error: {exc}")

        if self.l2:
            try:
                l2_docs = self.l2.search(query, top_k=top_k, domain=domain)
            except Exception:
                l2_docs = []
            seen_texts = {d.page_content[:120] for d in combined}
            for doc in l2_docs:
                if doc.page_content[:120] not in seen_texts:
                    combined.append(doc)
                    seen_texts.add(doc.page_content[:120])

        source_layer = 1 if l1_used else 2

        if len(combined) < top_k and self.l3:
            try:
                l3_docs = self.l3.search(query, top_k=top_k, domain=domain)
                seen_texts = {d.page_content[:120] for d in combined}
                for doc in l3_docs:
                    if doc.page_content[:120] not in seen_texts:
                        combined.append(doc)
                        seen_texts.add(doc.page_content[:120])
            except Exception:
                pass

        if len(combined) < top_k and self.web and config.USE_WEB_SEARCH:
            try:
                web_docs = self.web.search(query, top_k=top_k)
                combined.extend(web_docs)
            except Exception:
                pass

        return self._format(combined[:top_k] if combined else [],
                           layer=source_layer, fast_path_hit=False, latencies={})

    # ── 后台日志 ──

    async def _log_remaining(self, tasks, latencies, t0):
        """L1 命中后后台等待 L2/L3 完成，记录延迟用于观测。"""
        for name in ["l2", "l3"]:
            if tasks.get(name):
                try:
                    await tasks[name]
                except Exception:
                    pass
        latencies["l2"] = (time.time() - t0) * 1000
        latencies["l3"] = (time.time() - t0) * 1000
        latencies["total"] = (time.time() - t0) * 1000

    # ── 格式化输出 ──

    def _format(self, docs: list[Document], layer: int,
                fast_path_hit: bool = False, latencies: dict = None) -> dict:
        result = {
            "results": {
                "documents": [[d.page_content for d in docs]],
                "metadatas": [[d.metadata for d in docs]],
            },
            "source_layer": layer,
            "fast_path_hit": fast_path_hit,
        }
        if latencies:
            # 只暴露延迟，不暴露内部距离值
            result["latency_ms"] = {
                k: round(v) for k, v in latencies.items() if v is not None
            }
        return result

    # ── 健康检查 ──

    def count_l1(self) -> int:
        return self.l1.count() if self.l1 else 0

    def count_l2(self) -> int:
        return self.l2.count() if self.l2 else 0

    def count_l3(self) -> int:
        return self.l3.count() if self.l3 else 0
