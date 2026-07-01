# CLAUDE_PROJECT_MEMORY.md
> 鏈枃浠舵槸 Claude Code銆丆odex 鍙婂叾浠栦唬鐞嗗叡浜殑浠撳簱璁板繂婧愩€傝褰曠ǔ瀹氫簨瀹炪€佸叧閿喅绛栥€佸綋鍓嶈繘搴﹀拰浜ゆ帴淇℃伅銆?

---

## 1. 椤圭洰蹇収

- 椤圭洰锛歊ightNow Fitness 鍓嶇 + 閰嶅鍚庣
- 鐩爣锛氭瀯寤轰竴涓Щ鍔ㄧ浼樺厛鐨勫仴韬簲鐢紝鍖呭惈 AI 瀵硅瘽銆佷綋鍨嬭繘鍖栥€佽褰曡拷韪拰绀惧尯鑳藉姏
- 褰撳墠褰㈡€侊細鍓嶇涓?React + TypeScript + Vite SPA锛涘悗绔綅浜?`rightnow-api/`锛屼负 NestJS
- 鍏变韩璁板繂鍗忚鐢熸晥鏃ユ湡锛?026-03-01

---

## 2. 鎶€鏈爤

| 灞傜骇 | 鎶€鏈?| 鐗堟湰 | 澶囨敞 |
|------|------|------|------|
| 鍓嶇妗嗘灦 | React | 19.2.4 | SPA锛屾棤 React Router |
| 璇█ | TypeScript | 5.8.2 | |
| 鏋勫缓宸ュ叿 | Vite | 6.2.0 | 榛樿寮€鍙戠鍙?5173 |
| 鏍峰紡 | Tailwind CSS | - | 娣辫壊涓婚锛屼富鑹?#B8FF00 |
| 3D 娓叉煋 | Three.js + R3F + Drei | - | Hero3D 缁勪欢 |
| 鍥捐〃 | Recharts | 3.7.0 | |
| AI | Google Gemini API | 1.5-flash | EvolutionEngine 瀵硅瘽 |
| 鍚庣妗嗘灦 | NestJS | - | `rightnow-api/` |
| ORM | Prisma | 6.19.2 | |
| 鏁版嵁搴?| PostgreSQL | 16-alpine | Docker锛岀鍙?15433 |
| 璁よ瘉 | JWT + bcrypt | - | |

---

## 3. 鍗忎綔妯″紡涓庡垎宸ワ紙2026-03-02 鏇存柊锛?

鏈」鐩湁涓夌被鍗忎綔鑰咃紝鏂囨。鍜?PR 闇€鍚屾椂闈㈠悜浜虹被鍜?AI Agent 鍙銆?

### 璐熻矗浜猴紙鐢ㄦ埛锛? AI Agent
- **璐熻矗妯″潡**锛欰I 鏁欑粌锛坄views/AIChat.tsx`锛夈€佹暟鎹湅鏉匡紙`views/DataDashboard.tsx`锛夈€佸緟鍔?TODO 鍔熻兘
- **宸ヤ綔鏂瑰紡**锛氱敤鎴峰畾鏂瑰悜 鈫?Claude Code 鏋舵瀯璁捐 鈫?Codex 浠ｇ爜瀹炵幇
- **宸ヤ綔鍒嗘敮**锛歚feat/ai-chat`銆乣dev`

### 鎶€鏈洟闃燂紙浜虹被寮€鍙戣€咃級
- **璐熻矗妯″潡**锛氶ギ椋熸媿鎽勶紙`views/DietLog.tsx`锛夈€佺ぞ鍖哄姛鑳斤紙`views/Community.tsx`锛?
- **鍙傝€冩枃妗?*锛歚COMMUNITY_FEATURE_SPEC.md`锛堢ぞ鍖哄姛鑳借鏍间功锛屽凡鍦ㄩ」鐩腑锛?
- **宸ヤ綔鍒嗘敮**锛歚feat/diet-camera`銆乣feat/community`

### UI/鍓嶇浼樺寲
- **璐熻矗鏂?*锛欰ntigravity Agent
- **宸ヤ綔鍒嗘敮**锛歚feat/ui-polish`

### Git 宸ヤ綔娴?
- **浠撳簱**锛歚BeAChanger/RightNow-3.2`锛圥rivate锛孏itHub锛?
- **鍒嗘敮绛栫暐**锛?
  - `main` 鈥?绋冲畾鐗堬紝鍙€氳繃 PR 鍚堝叆
  - `dev` 鈥?闆嗘垚鍒嗘敮锛屾墍鏈?feature 鍏堝悎鍒拌繖閲?
  - `feat/*` 鈥?鍔熻兘鍒嗘敮锛屾寜妯″潡鍒掑垎
- **鍚堝苟娴佺▼**锛歠eature 鈫?PR 鈫?dev锛堥泦鎴愭祴璇曪級鈫?PR 鈫?main
- **璇︾粏瑙勫垯**锛氳 `GIT_WORKFLOW.md`

---

## 4. 鏋舵瀯涓庣害瀹?

### 鍓嶇

- 璺敱锛氫娇鐢?`View` 鏋氫妇 + `useState<View>` 鍒囨崲瑙嗗浘锛屼笉浣跨敤 React Router
- 鐘舵€侊細`App.tsx` 鎻愬崌绠＄悊鐢ㄦ埛鍩虹鏁版嵁锛屽啀閫氳繃 props 涓嬩紶
- API 灞傦細`api/client.ts` 璐熻矗 Axios 瀹炰緥銆丣WT 闄勫姞鍜屽搷搴旇В鍖咃紱`api/index.ts` 缁熶竴瀵煎嚭
- UI 璇█锛氬叏涓枃
- 鍥炬爣锛欸oogle Material Icons锛圤utlined / Round锛?
- 璁捐绾︽潫锛氱Щ鍔ㄧ浼樺厛锛屾敮鎸佸畨鍏ㄥ尯鍩?

### 鍚庣

- 妗嗘灦锛歂estJS锛屾ā鍧楀寲缁撴瀯
- 璁よ瘉鎺ュ彛锛歚POST /auth/register`銆乣POST /auth/login`銆乣GET /auth/me`
- 鏁版嵁灞傦細PostgreSQL + Prisma
- 宸叉湁妯″潡锛歚auth`銆乣weight`銆乣diet`銆乣training`銆乣todos`銆乣checkins`銆乣evolution`銆乣posts`銆乣friendships`銆乣chat`銆乣upload`銆乣user`
- CORS锛歚http://localhost:5173`

### 鍗忎綔绾﹀畾

- 鏈枃浠舵槸椤圭洰鐘舵€佸敮涓€鍏变韩浜嬪疄婧愶紝涓嶅啀鎷嗗垎涓哄涓唬鐞嗕笓鐢ㄨ蹇嗘枃浠?
- 鎵€鏈夊叡浜妧鑳界粺涓€娉ㄥ唽鍦?`SKILL_REGISTRY.md`锛屾妧鑳芥枃浠跺瓨鏀句簬 `skills/<name>/SKILL.md`
- 4 涓牳蹇冩妧鑳斤紙fankui銆乸roject-orchestrator銆乫eature-co-creation-socratic-frontend銆乻kill-co-learn锛夊凡鍏ㄥ眬瀹夎鍒板悇 Agent 榛樿璺緞
- 楂樹环鍊肩粡楠屾矇娣€涓庝笁浣?Agent 鍏卞浼樺厛鍙傝€?`skills/skill-co-learn/SKILL.md`
- 浜у搧鍔熻兘鍏卞垱涓?`/function-talk` 浼樺厛鍙傝€?`skills/feature-co-creation-socratic-frontend/SKILL.md`
- 璇︾粏鍙傝€冨彲鍥炵湅 `.claude/commands/*.md`锛屼絾椤圭洰鐘舵€佸簲鍥炲啓鍒版湰鏂囦欢

---

## 5. 褰撳墠绋冲畾鍐崇瓥

- 鎵€鏈夌晫闈㈡枃妗堝繀椤讳繚鎸佷腑鏂囷紝涓嶇淮鎶よ嫳鏂?UI
- 涓嶅垱寤洪噸澶嶉〉闈㈡枃浠讹紝灏ゅ叾閬垮厤鎭㈠姝ゅ墠宸叉竻鐞嗙殑 `*Screen.tsx` 鍓湰
- 淇濈暀鐢ㄦ埛宸叉湁鏀瑰姩锛屼笉鍋氶噸缃紡鎿嶄綔
- 浼樺厛妯″潡鍖栨帹杩涳紝涓€娆¤仛鐒︿竴涓ā鍧?
- 榛樿鎸夆€滄渶灏忓彲琛屾敼鍔ㄢ€濅慨澶嶉棶棰橈紝閬垮厤杩囧害宸ョ▼鍖?

---

## 6. 鏈€杩戦噸瑕佸彉鏇?

| 鏃ユ湡 | 璐熻矗鏂?| 绫诲瀷 | 鎻忚堪 |
|------|--------|------|------|
| 2026-02-28 | 鍙屾柟 | 閰嶇疆 | Docker PostgreSQL 鍚姩锛孭risma schema 鍚屾瀹屾垚 |
| 2026-02-28 | 鍙屾柟 | 鍔熻兘 | 瀹屾垚鍏ㄩ儴 10 涓ā鍧椾腑鑻辨枃缁熶竴锛孶I 鍏ㄤ腑鏂囧寲 |
| 2026-02-28 | 鍙屾柟 | 淇 | 淇 `vite-env.d.ts` 鍜?`Onboarding.tsx` 缂栫爜鎹熷潖闂 |
| 2026-02-28 | 鍙屾柟 | 閲嶆瀯 | 鍚堝苟閲嶅鏂囦欢锛坄Login/LoginScreen`銆乣Register/RegisterScreen`锛?|
| 2026-02-28 | 鍙屾柟 | 鍔熻兘 | `Login.tsx` 鍚堝苟婕旂ず璐﹀彿鑳藉姏锛坄demo@rightnow.fit`锛?|
| 2026-03-01 | Codex | 鍗忎綔 | 寤虹珛鍏变韩璁板繂鍗忚锛屾柊澧?`AGENTS.md` 涓?`shared-skills/` 缁熶竴璺ㄤ唬鐞嗗伐浣滄祦 |
| 2026-03-01 | Codex | 鍗忎綔 | 鏂板姝ｅ紡浠撳簱鎶€鑳?`skills/fankui/SKILL.md`锛屽榻?Claude 鐨?`/fankui` 宸ヤ綔娴?|
| 2026-03-01 | Codex | 淇 | 淇鏄惧寲椤甸灞忕敓鎴愮姸鎬併€佸己鍖栫敓鍥惧畨鍏?prompt 涓庣函鑹茶儗鏅害鏉燂紝骞朵慨澶嶆鑴歌瀺鍚堟湭浼犲弬鑰冨浘鐨?bug |
| 2026-03-01 | Codex | 淇 | 淇鎵撳崱鎴愬姛椤甸敊璇烦鍥?Onboarding銆佷慨澶嶆诞鍔ㄥ姪鎵嬪畾鏃跺櫒娉勬紡涓庢嫋鎷借瑙︼紝骞舵牎姝?`checkinsApi.latest()` 鐨勫彲绌鸿繑鍥炵被鍨?|
| 2026-03-01 | Codex | 淇 | 淇鏁版嵁鐪嬫澘 AI 寤鸿缂撳瓨涓嶅埛鏂般€佷慨澶嶉ギ椋熼〉鍚屽浘閲嶅涓婁紶涓嶈Е鍙戙€佷慨澶嶇ぞ鍖鸿瘎璁鸿緭鍏ヨ法甯栧瓙涓插€硷紝骞堕檺鍒垛€滃姞杞芥洿澶氣€濋噸澶嶈Е鍙?|
| 2026-03-01 | Codex | 鏂囨。 | 妫€鏌ュ苟鎭㈠鏈湴寮€鍙戠幆澧冿紝纭 `5173` 涓?`3000` 鍙闂紝骞舵柊澧?`LOCAL_DEV_STARTUP.md` 鍚姩鎸囧崡 |
| 2026-03-01 | Codex | 鍗忎綔 | 灏?`skills/skill-co-learn/SKILL.md` 鍗囩骇涓?v4.0 鍏ㄥ眬/椤圭洰鏅鸿兘鐗堬紝鏂板寮哄埗 Scope 鍒ゆ柇涓庤矾寰勬櫤鑳介€傞厤瑙勫垯 |
| 2026-03-02 | Claude Code | 閰嶇疆 | 寤虹珛 Git 澶氫汉澶?Agent 鍗忎綔妯″紡锛氭柊寤?Private 浠撳簱 BeAChanger/RightNow-3.2锛屽垱寤?dev + 5 涓?feat/* 鍒嗘敮锛岀紪鍐?GIT_WORKFLOW.md |
| 2026-03-02 | Claude Code | 鍗忎綔 | 缁熶竴鎶€鑳界郴缁燂細鏂板缓 SKILL_REGISTRY.md 娉ㄥ唽琛紝鍚堝苟 shared-skills/ 鈫?skills/锛? 涓牳蹇冩妧鑳藉叏灞€瀹夎鍒?Claude Code / Codex / Antigravity锛屽叆鍙ｆ枃浠剁粺涓€鎸囧悜娉ㄥ唽琛?|
| 2026-03-02 | Claude Code | 鏂囨。 | 鏄庣‘涓夋柟鍗忎綔鍒嗗伐锛氳礋璐ｄ汉+Agent锛圓I鏁欑粌/鏁版嵁鐪嬫澘/TODO锛夈€佹妧鏈洟闃燂紙楗鎷嶆憚/绀惧尯锛夈€丄ntigravity锛圲I锛夛紝鍒犻櫎宸茶В鍐崇殑闂鍙嶉鏂囦欢澶癸紝鏇存柊鎵€鏈夊崗浣滄枃妗ｄ繚鎸佷竴鑷?|

---

## 7. 褰撳墠寰呭姙

### 璐熻矗浜?+ AI Agent锛堝綋鍓嶆墽琛屼腑锛?
- [ ] AI 鏁欑粌鍔熻兘瀹屽杽锛坄AIChat.tsx`锛?鈥?瀵硅瘽浣撻獙銆佷笂涓嬫枃璁板繂銆佽缁冨缓璁?
- [ ] 鏁版嵁鐪嬫澘鍔熻兘瀹屽杽锛坄DataDashboard.tsx`锛?鈥?缁熻鍥捐〃銆佽秼鍔垮垎鏋?
- [ ] 寰呭姙/TODO 鍔熻兘 鈥?鐢ㄦ埛璁粌璁″垝绠＄悊

### 鎶€鏈洟闃燂紙浜虹被寮€鍙戣€呰礋璐ｏ級
- [ ] 楗鎷嶆憚鍔熻兘锛坄feat/diet-camera`锛?鈥?鎷嶇収璇嗗埆銆佸崱璺噷璁＄畻
- [ ] 绀惧尯鍔熻兘锛坄feat/community`锛?鈥?璇﹁ `COMMUNITY_FEATURE_SPEC.md`

### 鍩虹鑱旇皟
- [ ] 鏈湴鑱旇皟娴嬭瘯锛堝悗绔?`start:dev` + 鍓嶇 `dev`锛?
- [ ] 娉ㄥ唽/鐧诲綍娴佺▼绔埌绔獙璇?
- [ ] Onboarding 鏁版嵁鎻愪氦鍒板悗绔獙璇?

---

## 8. 椋庨櫓涓庨樆濉?

- 鍓嶅悗绔櫧宸插叿澶囧熀纭€缁撴瀯锛屼絾鑱旇皟楠岃瘉灏氭湭瀹屾暣闂幆
- 鍏变韩璁板繂鏈哄埗鍒氬缓绔嬶紝鍚庣画闇€瑕佹寔缁洖鍐欙紝鎵嶈兘鐪熸褰㈡垚璺ㄤ唬鐞嗕笂涓嬫枃杩炵画鎬?
- 鐢熶骇鏋勫缓宸查€氳繃锛屼絾鍓嶇涓诲寘浠嶇害 714.69 kB锛屽瓨鍦ㄥ悗缁媶鍖呬紭鍖栫┖闂?

---

## 9. 鍗忎綔鍋忓ソ

- 鐢ㄦ埛鏄紑鍙戞柊鎵嬶紝瑙ｉ噴瑕佺畝娲佹槗鎳?
- 鎵€鏈夊鐢ㄦ埛娌熼€氫紭鍏堜娇鐢ㄤ腑鏂?
- 闇€瑕佸彲鎺ユ墜鎬у己鐨勪笂涓嬫枃锛屾柟渚?Claude Code銆丆odex 鎴栧叾浠?AI 鏃犵紳缁х画

---

## 10. 浜ゆ帴娓呭崟

鍦ㄥ紑濮嬮潪鐞愮浠诲姟鍓嶏細

- 鍏堥槄璇绘湰鏂囦欢
- 鏌ョ湅 `SKILL_REGISTRY.md` 浜嗚В鍙敤鎶€鑳?

鍦ㄥ畬鎴愭湁鎰忎箟鐨勬敼鍔ㄥ悗锛?

- 鏇存柊鏈枃浠剁殑鈥濇渶杩戦噸瑕佸彉鏇?/ 褰撳墠寰呭姙 / 椋庨櫓涓庨樆濉炩€濈浉鍏虫爮鐩?
- 濡傛灉鏄樁娈垫€ф帹杩涳紝鍚屾椂鏇存柊 `PROJECT_REPORT.md`

---

## 11. 閫氱敤璁板繂鏇存柊妯℃澘

褰撻渶瑕佽拷鍔犱竴娆℃柊鐨勯」鐩褰曟椂锛屼紭鍏堟寜涓嬮潰鏍煎紡鏇存柊锛屽敖閲忎繚鎸佺畝鐭€佸彲妫€绱€佸彲浜ゆ帴銆?

```md
### 鏇存柊璁板綍锛圷YYY-MM-DD锛?

- 璐熻矗鏂癸細Claude / Codex / 鐢ㄦ埛 / 鍙屾柟
- 绫诲瀷锛氬姛鑳?/ 淇 / 閲嶆瀯 / 閰嶇疆 / 鍗忎綔 / 鏂囨。
- 褰卞搷鑼冨洿锛氭秹鍙婄殑妯″潡銆侀〉闈€佹帴鍙ｆ垨鐩綍
- 鍙樻洿鍐呭锛氳繖娆″疄闄呮敼浜嗕粈涔?
- 鍐崇瓥/绾︽潫锛氳繖娆＄‘瀹氫簡浠€涔堣鍒欙紝鍚庣画瑕佺户缁伒瀹堜粈涔?
- 鍚庣画鍔ㄤ綔锛氳繕鍓╀粈涔堣鍋氾紝璋佹帴鎵嬫椂鍏堢湅浠€涔?
- 椋庨櫓/娉ㄦ剰锛氭槸鍚︽湁鏈獙璇侀」銆佽仈璋冮闄┿€佸吋瀹规€ч闄?
```

鎺ㄨ崘鏇存柊鏂瑰紡锛?

- 濡傛灉鏄凡瀹屾垚鏀瑰姩锛屼紭鍏堝悓姝ュ埌鈥滄渶杩戦噸瑕佸彉鏇粹€?
- 濡傛灉鏄柊澧炲緟鍔烇紝浼樺厛鍚屾鍒扳€滃綋鍓嶅緟鍔炩€?
- 濡傛灉鏄柊鍙戠幇鐨勯棶棰橈紝浼樺厛鍚屾鍒扳€滈闄╀笌闃诲鈥?
- 濡傛灉鏄暱鏈熻鍒欏彉鍖栵紝浼樺厛鍚屾鍒扳€滃綋鍓嶇ǔ瀹氬喅绛栤€濇垨鈥滃崗浣滃亸濂解€?

## 12. Update Log (2026-03-02)

- Codex: fixed the Onboarding custom ideal image picker by switching from hidden-input `ref.click()` to native `label` / `input[type=file]` binding for more reliable mobile uploads.

## 13. AI Coach Architecture Sync (2026-03-02)

- `AI_COACH_ARCHITECTURE.md` is already present and is now the active handoff contract for AI Coach implementation.
- Codex starts with the non-UI slices: `public/knowledge/*`, `api/ai-coach.ts`, `api/index.ts`, `services/gemini.ts`, then backend `ai-coach` module and Prisma changes.
- Antigravity owns the UI state machine and coach cards; backend/API work should preserve the documented contract and adapt to the locked UI.

## 14. AI Coach Bootstrap Implementation (2026-03-02)

- Completed in code: `public/knowledge/*`, `api/ai-coach.ts`, `api/index.ts`, `services/gemini.ts` coach helpers, `rightnow-api/src/ai-coach/ai-coach.module.ts`, `rightnow-api/src/app.module.ts`, and `vite.config.ts` proxy support.
- The temporary `FitnessPlan.aiSummary` bootstrap path has been replaced: AI Coach now uses dedicated Prisma models in `rightnow-api/prisma/schema.prisma`.
- Prisma client types were regenerated with `npx prisma generate --no-engine` because the Windows query engine DLL was locked; frontend and backend builds both pass after that.
- The schema change has now been applied to the local PostgreSQL database with `prisma db push`; the remaining step is runtime endpoint verification.

## 15. AI Coach Runtime Verification (2026-03-02)

- The old API process on port `3000` was stopping Prisma client regeneration by locking `query_engine-windows.dll.node`; stopping and restarting the process resolved it.
- `prisma generate` now succeeds normally again, the backend is restarted on `3000`, and runtime smoke checks pass.
- Verified behavior: authenticated `assessment`, `progress`, `intake`, and `first-plan` endpoints respond; `trainingDaysPerWeek <= 2` is rejected with HTTP `400`.
- Compatibility fix added: legacy `User.currentPhase` values like `A/B/C/D` are normalized into the new `foundation/build/cut/maintain` stage contract.

## 16. AI Coach Profile Engine (2026-03-02)

- Added persistent profile models in Prisma: `AiCoachProfile` (latest profile) and `AiCoachProfileSnapshot` (history archive), and added `AiCoachIntake.extraAnswers` to absorb future form payloads.
- Extended `rightnow-api/src/ai-coach/ai-coach.module.ts` with:
  - profile generation logic (fitness/hydration/meal recommendations),
  - `GET /api/ai-coach/profile`,
  - `POST /api/ai-coach/profile/refresh`,
  - scheduler-based auto refresh every 6 hours.
- Extended frontend API contract only at type/API layer (`api/ai-coach.ts`, `api/index.ts`) without changing any UI component or style.
- Verified locally on `http://localhost:3000`: profile generation works, manual refresh increments `profileVersion`, and intake hard rejection rule remains effective.

## 17. AI Chat Re-entry Fix (2026-03-02)

- Fixed repeat-intake bug in `views/AIChat.tsx`: after user has already completed intake/plan creation, re-entering coach now checks backend progress and goes directly to existing first-day plan instead of asking intake again.
- The fix is logic-only and does not modify component styles or visual layout classes.

## 18. AI Chat Feedback Fix (2026-03-02)

- Fixed Gemini chat 404 resilience in `services/gemini.ts` by adding model fallback (`gemini-2.0-flash` -> `gemini-1.5-flash-latest` -> `gemini-3-flash-preview`) when model-not-found occurs.
- Updated free chat behavior in `views/AIChat.tsx`: prompt now explicitly requires concise responses and a post-processor removes `*` and hard-limits assistant replies to 100 characters.
- Scope is minimal and logic-only; no UI style/layout changes were introduced.

## 19. Gemini 503 Resilience Fix (2026-03-02)

- Updated `services/gemini.ts` request fallback to treat transient HTTP statuses (`429/500/502/503/504`) as retryable.
- Added short per-model retry (`2` attempts with incremental backoff) before switching to the next chat model candidate.
- This prevents one temporary `503 Service Unavailable` from immediately surfacing as a hard chat failure in Evolution Engine text refinement.
- Verified frontend integrity with `npm run build` at repo root.

## 24. AI Coach Intake 500 + Loop Fix (2026-03-03)

- Root cause confirmed: local PostgreSQL table `AiCoachIntake` was behind current Prisma schema, missing columns including `equipmentList`, `trainingEnvironment`, `timePreference`, and diet fields. This caused `POST /api/ai-coach/intake` and `POST /api/ai-coach/first-plan` (prepare) to fail with HTTP `500`.
- Local DB was synced using `npm --prefix rightnow-api run prisma:push`.
- Backend hardening in `rightnow-api/src/ai-coach/ai-coach.module.ts`:
  - added `CoachIntakeInput` typing,
  - added `buildIntakeExtraAnswers(...)`,
  - added `getIntakeCompat(...)` minimal select read path.
- Frontend flow fix in `views/AIChat.tsx`:
  - removed error-time loop-back to `intake-frequency`,
  - on backend failure, fallback to a safe local first-day plan and continue onboarding flow.

## 25. Coach-Build Portrait KB Skeleton Output (2026-03-03)

- Added reproducible generator script: `scripts/generate_user_portraits_kb.py`.
- Generated deliverable file: `knowledge/user_portraits_kb_coach_build.xml`.
- Output structure follows XML + embedded JSON contract for downstream RAG filling:
  - total portraits: `48` (`P001`-`P048`)
  - each portrait includes full `dimensions_snapshot`
  - each portrait has `6` `knowledge_fill_points` (meal x2, hydration x2, training x2)
  - description length is constrained to `150-200` Chinese chars (actual: `150-168`).
- Edge coverage explicitly included in dimensions: postpartum recovery, 50+, severe rehab, highly busy fragmented schedule, and outdoor-only training profiles.

## 26. Community PRD Consolidation (2026-03-03)

- Consolidated community product requirements into `绀惧尯prd/绀惧尯PRD_缁煎悎鐗?md` using `绀惧尯prd/绀惧尯.md` as the core source plus current implementation files.
- The new PRD now aligns vision + current code baseline + API/schema constraints + phased delivery plan for Community, Buddy matching, and Buddy room Lite.
- It also formalizes the integration path from training feedback cards to editable community posting, consistent with `TODO鍜岃缁冭褰昉RD.md`.

## 27. Diet Camera PRD Consolidation (2026-03-04)

- Added consolidated product spec `楗鎷嶇収PRD.md` based on Socratic co-creation decisions.
- Locked MVP flow as `AI draft -> editable confirm card -> formal save`, where closing the card discards draft (no write).
- Locked performance/accuracy strategy: single-photo whole-meal recognition, `P95 <= 2s`, launch accuracy `卤15%~卤20%`, long-term target `卤10%`.
- Locked retention lifecycle: keep photo/details/training samples for natural 30-day window, then Beijing-time next-day `12:00` batch cleanup; preserve read-only daily nutrition aggregates only.

## 28. Auth 500 Startup Unblock (2026-03-04)

- Root cause of frontend login `POST /api/auth/login 500` (with "Service unavailable") was backend not starting due TypeScript compile errors in `rightnow-api`.
- Fixed backend compile blockers:
  - exported `TodosService` from `rightnow-api/src/todos/todos.module.ts`,
  - added explicit callback type for `dayPlan.exercises.map((e: any) => e.name)`,
  - corrected `TrainingModule` import to `import { TodosModule, TodosService } from '../todos/todos.module'`,
  - changed `findUnique(...)` to `findUniqueOrThrow(...)` for non-null record mapping in training create flow.
- Added backend host configurability in `rightnow-api/src/main.ts` (`HOST`, default `127.0.0.1`) to avoid hardcoded wildcard binding.
- Verification status:
  - `npm --prefix ./rightnow-api run build` passes.
  - In Codex sandbox runtime, Node listen fails with `EACCES` on loopback ports (environment restriction), so final runtime validation must be done in user local terminal.

## 29. Windows Reserved Port Mitigation (2026-03-04)

- Confirmed by `netsh interface ipv4 show excludedportrange protocol=tcp`: local reserved range includes `2977-3076`, which contains `3000`; backend listen on `3000` fails with `EACCES`.
- Updated local defaults to avoid reserved port collision:
  - `rightnow-api/.env`: `PORT=4000`
  - `vite.config.ts`: fallback `VITE_API_PROXY_TARGET` changed to `http://localhost:4000`
  - `LOCAL_DEV_STARTUP.md`: backend port references updated from `3000` to `4000`.
- Verification: both `npm --prefix ./rightnow-api run build` and root `npm run build` pass.

## 30. ActionCenter Todo Crash Guard (2026-03-04)

- User-reported black screen on entering ActionCenter was traced to runtime `TypeError: todos.filter is not a function` in `views/ActionCenter.tsx`.
- Implemented minimal defensive fix at both API and view layers:
  - `api/todos.ts` now normalizes list/item payloads (`array`, nested `data`, or `items`) before returning to UI.
  - `views/ActionCenter.tsx` now computes from `safeTodos` and guards state update paths (`list` and `toggle`) with `Array.isArray`.
- Small contract alignment: `api/training.ts` `trainingApi.create(...)` now accepts optional `duration` to match current ActionCenter submit payload.
- Verification: root `npm run build` passes.

## 31. AI Coach -> Todo Auto Link Fix (2026-03-04)

- User issue: after AI Coach plan generation, ActionCenter/TODO remained empty.
- Backend todo generation chain updated in `rightnow-api/src/todos/todos.module.ts`:
  - `list(...)` now calls `ensureDailyTodos(...)` (not only default seed).
  - `ensureDailyTodos(...)` now prioritizes `AiCoachProgress.activePlan.tasks` as todo source.
  - Added category mapping from coach task categories to todo categories (`nutrition -> diet`, hydration-like recovery -> `water`, others -> `training`).
  - Profile fallback now reads `fitnessPlan.weeklyTrainingPlan` (aligned with current profile schema), then hydration/meal defaults, then hard default todos.
- Frontend sync hardening:
  - `views/ActionCenter.tsx` now calls `todosApi.ensureDaily(today)` before list fetch.
  - `views/AIChat.tsx` triggers best-effort `todosApi.ensureDaily(today)` right after `saveFirstPlan(...)` success.
- Verification: `npm --prefix ./rightnow-api run build` and root `npm run build` both pass.

## 32. ActionCenter Chain + Diet/Community Black Screen Follow-up (2026-03-04)

- Root causes addressed:
  - AI coach intake could fail with HTTP `400` when user selected "1-2 days/week" (backend requires `>= 3`), causing UI fallback plan to display without persisted progress/todos.
  - Diet/Community pages still had fragile assumptions about API payload shapes (array/object mismatch), which could trigger runtime black screens.
- Chain stabilization:
  - `views/AIChat.tsx`: `parseTrainingDays('1-2')` now maps to `3` to satisfy backend constraint and avoid silent non-persistence.
  - `rightnow-api/src/todos/todos.module.ts`: `ensureDailyTodos(...)` now replaces same-day non-coach todos with coach-plan todos when `AiCoachProgress.activePlan` exists, preventing stale/default todos from blocking coach sync.
- Page crash hardening:
  - `api/diet.ts`, `api/posts.ts`, `api/friendships.ts` now normalize response payloads (`array`, nested `data`, `items`/`records`) before returning typed data.
  - `views/DietLog.tsx` and `views/Community.tsx` now use defensive `Array.isArray` guards for render/state updates.
  - `views/Community.tsx` also fixed malformed JSX tags that could cause immediate render failure.
- Verification:
  - Frontend build: `npm run build` passes.
  - Backend build: `npm --prefix ./rightnow-api run build` passes.

## 33. ActionCenter Todo Sync Fallback Hardening (2026-03-04)

- User-followup issue: AI chat could show first-day plan while ActionCenter TODO still displayed empty.
- `views/ActionCenter.tsx` now uses a resilient load chain:
  - `todosApi.ensureDaily(today)` is best-effort and no longer blocks subsequent list fetch if it fails.
  - always performs `todosApi.list(today)` afterward.
  - if list is empty, it pulls `aiCoachApi.getProgress()` and backfills todos from `activePlan.tasks` via `todosApi.create(...)`, then refetches list.
- Added defensive rendering (`safeTodos`) and visible error banner in TODO tab to avoid silent-empty states.
- Verification: root `npm run build` and `npm --prefix ./rightnow-api run build` both pass.

## 34. Auth Login 500 Startup Hardening (2026-03-05)

- Root cause of repeated frontend login `POST /api/auth/login 500` in local dev: backend startup path was brittle.
  - Prisma Client could be stale relative to `backend/prisma/schema.prisma`, causing large TypeScript compile failures during `start:dev`.
  - `scripts/start-dev.ps1` / `scripts/start-dev.sh` launched frontend immediately after dispatching backend, so users saw frontend 500 even when backend never became healthy.
- Code-level compile fix in `backend/src/admin/admin-knowledge.module.ts`:
  - switched upload `Blob` input from raw `Buffer` to `Uint8Array` wrapper for Node TS compatibility,
  - normalized RAG response fields (`chunks_deleted`, `files_processed`, `chunks_added`) to numeric JSON-safe values before audit logging.
- Startup hardening:
  - root `package.json` `dev:backend` now runs `npm --workspace backend run prisma:generate && npm --workspace backend run start:dev`.
  - `scripts/start-dev.ps1` now waits for backend readiness (`/api/auth/me`) before starting frontend/admin/rag; fails fast with explicit message if backend is not ready in 40s.
  - `scripts/start-dev.sh` now does the same readiness gating with `curl`.
- Verification performed in workspace:
  - `npm --workspace backend run build` passes.
  - `npm run dev:backend` compiles with `Found 0 errors` and reaches Nest boot logs/routes.


## 35. Gemini Model Policy Lock (2026-03-05)

- Locked interaction/chat model to `gemini-3-flash-preview` for all text and multimodal dialog flows.
- Locked image generation model policy to primary+fallback:
  - primary: `gemini-3.1-flash-lite-preview`
  - fallback: `gemini-3.1-flash-image-preview`
- Source of truth doc added: `docs/AI_MODEL_POLICY.md`.
- Any future model changes must update both runtime constants and `docs/AI_MODEL_POLICY.md` together.

## 36. Feedback Doc Fixes: TODO/Upload/Post Flow (2026-03-05)

- Processed `问题反馈/问题反馈.docx` and implemented minimal code fixes for 4 reported issues.
- Coach plan -> TODO sync hardening:
  - `backend/src/ai-coach/ai-coach.module.ts`: `saveFirstPlan(...)` now best-effort calls `todosService.ensureDailyTodos(...)` after persisting active plan.
  - `frontend/views/AIChat.tsx`: when loading existing `activePlan`, frontend now also best-effort triggers `todosApi.ensureDaily(today)`.
- Diet photo upload 500 hardening:
  - `backend/src/diet/diet.service.ts`: added graceful fallback nutrition payload when AI photo/text analysis fails, so draft creation does not fail with 500.
  - `frontend/views/DietLog.tsx`: gallery now filters to real uploaded assets (`/uploads/`) to avoid showing old mock/placeholder URLs.
- Community posting fixes:
  - `frontend/App.tsx`: wired `DraftConfirm` publish to real `postsApi.create(...)` and return to Community after success.
  - `frontend/views/DraftConfirm.tsx`: upgraded publish flow to async with loading/error handling.
  - `frontend/api/posts.ts`: expanded `create(...)` payload typing to include `visibility`, `postType`, `sourceType`, `sourceRefId`, `aiDraftPayload`.
  - `frontend/views/ManualPost.tsx`: fixed malformed JSX, switched upload call to `uploadApi.upload(...)`, and now passes selected `visibility` when creating post.
  - `frontend/views/ActionCenter.tsx`: added TODO-tab floating post entry + post mode sheet (manual / AI draft), routed via `onNavigate` to composer flows.
- Verification:
  - Backend build passes: `npm --workspace backend run build`.
  - Frontend build is currently blocked by pre-existing syntax corruption in `frontend/views/AIChat.tsx` (unterminated string literals unrelated to these fixes).

### 2026-03-06 TODO/AIChat 文案与同步修复（Codex）
- `views/ActionCenter.tsx`：修复页面中文文案乱码（行动中心、今日 TODO、记录训练、加载态、空态、分类标签、训练记录文案等）。
- `views/AIChat.tsx`：修复顶部状态文案显示异常（`AI 教练`、`在线 · 实时陪练`、输入占位文案），并在已有 `activePlan` 时补充 `todosApi.ensureDaily(...)`。
- 日期统一：`ActionCenter`、`AIChat`、`TodoList` 的 todo 日期改为本地日历日（不再直接使用 UTC `toISOString().slice(0,10)`）。
- `backend/src/todos/todos.module.ts`：默认日期改为上海时区日历日，避免前后端日界线不一致导致“计划不同步/空列表”。
- 备注：`backend` 构建仍受既有问题阻塞（`training.module.ts` 调用 `AiService.requestGemini` 私有方法），与本次修复无直接关系。

## 37. Evolution Progress Route + Resilience Fix (2026-03-06)

- Fixed frontend dev proxy route in `vite.config.ts` by adding `/api/evolution-stage`, preventing stage requests from bypassing backend and rendering an empty path-only screen.
- Hardened `api/evolution-stage.ts` with runtime payload validation/normalization for both `list` and `assess` responses, avoiding silent bad-shape acceptance.
- Hardened `views/EvolutionProgress.tsx`:
  - only auto-scrolls to bottom when stage nodes are available,
  - falls back to local template stages when API data is unavailable,
  - shows a non-blocking load issue hint,
  - applies image `onError` fallback to prevent broken-node rendering.
- Updated `App.tsx` to include `View.EvolutionProgress` in `shouldHideBottomNav`, preventing immersive page overlap with BottomNav.
- Verification:
  - `esbuild` parse/bundle checks pass for `App.tsx`, `views/EvolutionProgress.tsx`, and `api/evolution-stage.ts`.
  - Full frontend build remains blocked by a pre-existing `views/AIChat.tsx` parse error (`Expected "finally" but found ")"`, around line 318).

## 38. Evolution Progress User-Photo Source Lock (2026-03-06)

- `views/EvolutionProgress.tsx` no longer uses hardcoded `/progress/*` images for stage cards.
- Stage image source is now locked to user data only:
  - local onboarding/current image: `rightnow_user_image`
  - local ideal image: `rightnow_ideal_body_image`
  - backend evolution records from `/api/evolution`
- Added stage-image hydration logic so `/api/evolution-stage` data is merged with user photo context, with current stage explicitly preferring current user photo and goal stage preferring ideal user image when available.
- If backend stage service is unavailable, fallback still renders path structure but only with user-photo context; no stock/mock person image is injected.
- When no user photo exists, cards show a neutral placeholder text (`等待你的照片`) instead of any mock image.
- Added strict user-photo filtering (`data:image`, `blob:`, `/uploads/`) so legacy stock/mock URLs from old stage payloads are ignored and cannot render in EvolutionProgress cards.

## 39. AI Coach Red Dot -> Card Flow Restore (2026-03-06)

- Root issue: when `coachTrigger` was active, chat page only showed plain greeting text and did not mount report/intake/plan cards.
- `views/AIChat.tsx` now restores a concrete coach flow state machine for coach mode:
  - load progress first; if existing `activePlan` exists, render `FirstDayPlanCard` directly,
  - otherwise fetch assessment and render `AssessmentCard` for confirmation,
  - if intake is missing, run an inline 4-step `IntakeQuestion` sequence,
  - then generate+save first-day plan (`generateFirstDayPlan` + `aiCoachApi.saveFirstPlan`) and render `FirstDayPlanCard`.
- Added coach-mode input lock during loading/assessment/intake/generating to ensure first-round guided interaction runs before free chat.
- Preserved training-mode session behavior (`trainingSessionApi`) and existing chat reply path.
- Verification: `npm --workspace frontend run build` passed after the change.

## 40. Training History Date Selection + Daily Detail View (2026-03-06)

- User request: training history should support selectable date (similar to diet log) and allow clicking to view that day's records.
- `frontend/views/TrainingHistory.tsx` updated with:
  - date picker (`input[type=date]`) + week strip quick-select,
  - daily summary cards (date / total minutes / record count) clickable to switch day,
  - dedicated "当天记录" detail section showing selected-day records.
- Added per-record time display support when `createdAt` exists.
- Data contract extension:
  - `frontend/api/training.ts`: `TrainingRecord` now includes optional `createdAt` / `updatedAt`.
  - `backend/src/training/training.module.ts`: training list/create/update response mapping now returns `createdAt` / `updatedAt` ISO strings.
- Verification:
  - backend build passes: `npm --workspace backend run build`.
  - full frontend build remains blocked by pre-existing syntax issue in `frontend/views/EvolutionProgress.tsx` (unrelated); the updated training history page itself compiles via `esbuild` bundle check.
