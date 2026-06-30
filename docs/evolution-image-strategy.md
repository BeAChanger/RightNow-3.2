# 阶段性身材演变与 AI 图像生成策略（完整版）

> **版本**：v4.1（定稿 · 含完整代码接入指南）
> **日期**：2026-06-30
> **状态**：策略定稿 · 提示词已固化 · 保底策略已设计 · 代码接入地图已完成
> **主生图模型**：**image2**（OpenAI 兼容图像接口），**nano banana 2** 作为 L1 保底
> **文档定位**：本文件是整个"身材演变生图系统"的**单一事实源**。所有提示词均为固化模板，后端实现时**只替换 `{{变量}}`，不得改写固定文案**。
>
> **⚠️ v4.1 重大调整（产品决策）**：
> 1. **取消 3 套穿搭图生成**（原 Step⑥ 模板 C / §3.6 整章）。每次解锁只产出 **1 张身材效果图**（模板 B），不再生成 athleisure / commute / resort。
> 2. **取消 onboarding 北极星的 3 套穿搭**（原 Step⓪c 后置的穿搭复用模板 C）。onboarding 只产出 **1 张终极身材图**（模板 D）。
> 3. **降级链精简为 image2 → nano banana 2 两级**。L1 不再枚举火山/通义/智谱/StepFun 多 provider，仅 nano banana 2。
> 4. **生图总量大幅下降**：单用户全周期由 ~34 张降至 **~8 张**（onboarding 1 张 + 6 阶段 × 1 张 + 重试预留 1 张）。

---

## 〇、核心设计原则

1. **提示词是模板，不是创作**：下文所有 Prompt 都是固定字符串，系统运行时仅做变量插值。**禁止**用 LLM 改写 Prompt，否则不可控、不可复现。
2. **身份锚点一次提取、全程复用**：用户首次上传时，用视觉模型提取一段「身份锚点描述」存档，此后每次生图都引用同一段锚点 → 保证跨阶段"始终是同一个人"。
3. **变化只发生在身材**：每张图严格锁定脸/肤色/发型/眼镜/场景，只允许身材随体脂变化。
4. **每阶段产出 1 张身材效果图**（v4.1 修订）：达标解锁某阶段时，仅生成 **1 张身材效果图**。**取消 3 套穿搭图**，让产品聚焦在"身材本身的可视化进步"，降低成本与维护负担。
5. **可降级、永不白屏**：image2 不可用时按多级保底链降级，用户始终能看到有意义的内容。
6. **北极星前置（onboarding 终极目标图）**：用户一进来，就基于起点照生成一张"最终目标身材（Stage 6）"图。即便此时只有一张起点照、偏差最大，也**必须生成**——这是整个激励系统的北极星，让用户在第一天就看到"你最终能变成什么样"，从而有动力开始并坚持。

---

## 一、完整流程（含 onboarding 北极星）

```
═══ 注册/Onboarding 阶段（仅一次）═══
Step⓪ 用户首次上传起点照 + 身高体重 + 目标
   │
   ├─→ ⓪a 视觉模型提取「身份锚点」存档（后续全程复用，保脸核心）
   ├─→ ⓪b 视觉模型估起点体脂（startBodyFat）
   └─→ ⓪c 【北极星】生成「终极目标身材图（Stage 6）」
         基于起点照 → 直接变换到目标体脂（男12%/女20%）
         → 作为激励系统的北极星展示
         （v4.1：取消同步生成的 3 套终极穿搭图）
         ▼
   ═══ 进入日常激励飞环 ═══

Step① 用户上传照片 + 身高体重（日常，每几天一次）
   │
   ▼
Step② 视觉体脂评估（StepFun vision 估体脂，失败→BMI 公式）
   │
   ▼
Step③ 身材轨迹记录与修正（历史评估点加权回归 → 当前体脂 + 斜率）
   │
   ▼
Step④ 达标判定（数值达标 + 视觉双重确认，连续 2 次/间隔≥24h 解锁）
   │
   ├─ 未达标 → 返回进度 + AI 预测天数 + 预测vs实际对比（回到 Step①等下次上传）
   │
   ▼ 达标解锁
Step⑤ 生成「下一阶段身材效果图」（多图融合：起点+中间+最新 → 目标体脂身材）
   │
   ▼
~~Step⑥ 并行生成「3 套穿搭风格图」~~ **v4.1 已取消**
   │
   ▼
Step⑦ 展示「未来的我」画廊 + 强化动机（蛇形时间线 + 鼓励文案）
```

| 步骤 | 触发频率 | 是否调生图模型 | 是否调视觉模型 | 耗费 |
|---|---|---|---|---|
| **⓪ onboarding 北极星** | **仅一次** | **是(image2)** | **是(锚点+体脂)** | **中**（1 张） |
| ① 上传 | 每几天一次 | 否 | 否 | - |
| ② 体脂评估 | 每次上传 | 否 | **是** | 低 |
| ③ 轨迹修正 | 每次上传 | 否 | 否 | - |
| ④ 达标判定 | 每次上传 | 否 | 可选 | 低 |
| ⑤ 身材图 | 仅解锁时 | **是(image2)** | 否 | 中（1 张） |
| ~~⑥ 穿搭图~~ | **v4.1 已取消** | — | — | — |
| ⑦ 展示 | 每次进入页面 | 否 | 否 | - |

> **成本说明**（v4.1 修订）：
> - Step ⓪ 仅在新用户注册时触发一次（**1 张终极身材图**），是"获客期"必要投入。
> - Step ⑤ 只在"解锁"时触发（每 2～4 周）；日常上传只做②（视觉评估，便宜得多）。
> - 单用户全周期：onboarding 1 张 + 6 阶段 × 1 张 = **7 张**（预留 1 张重试 ≈ 8 张），分摊到数月。比 v4.0 的 34 张下降 ~76%。

---

## 二、阶段划分与达标

### 2.1 七阶段（减速曲线）

真实减脂"前快后慢"，故采用减速曲线而非线性等分。

| 阶段 | 标题 | 累计进度 p | 心理意义 |
|---|---|---|---|
| 0 | 当前的我 | 0% | 诚实面对 |
| 1 | 初见成效 | 35% | "真的在变" |
| 2 | 轮廓清晰 | 55% | 朋友注意到 |
| 3 | 蜕变可见 | 70% | 穿衣变好看 |
| 4 | 接近理想 | 82% | 自信建立 |
| 5 | 最后冲刺 | 92% | 突破平台 |
| 6 | 理想中的我 | 100% | 达成目标 |

**目标体脂计算**：
- `目标体脂[i] = 起始体脂 − (起始体脂 − 目标体脂) × p[i]`
- `起始体脂` = 首次视觉评估；`目标体脂` = AI Coach 设定（默认男 12% / 女 20%，女性不低于 18%）

### 2.2 解锁规则
- 达标 = 单次评估体脂 ≤ 阶段目标体脂
- 解锁 = **连续 2 次**达标 + 间隔 **≥24h**
- 已解锁不因一次反弹锁回，但标记"需巩固"

---

## 三、提示词体系（固化模板）

### 3.1 变量字典（运行时由后端填充）

所有 Prompt 中 `{{xxx}}` 为变量，其余文字**固定不变**。

| 变量 | 来源 | 示例值 | 说明 |
|---|---|---|---|
| `{{gender}}` | 用户档案 | `male` / `female` | |
| `{{genderWord}}` | 派生 | `man` / `woman` | 英文文案用 |
| `{{age}}` | 用户档案 | `30` | |
| `{{identityAnchors}}` | **首次上传视觉提取** | 见下 | **保脸核心**，存档后全程复用 |
| `{{startBodyFat}}` | 首次评估 | `27.0` | onboarding 模板 D 用 |
| `{{currentBodyFat}}` | 最新评估 | `22.0` | 日常模板 B 用（onboarding 时 = startBodyFat） |
| `{{targetBodyFat}}` | 阶段目标 | `16.0` | |
| `{{reducedFat}}` | start−current | `5.0` | |
| `{{weeksElapsed}}` | 时间差 | `6` | |
| `{{bodyDescriptionByTarget}}` | **查表 §3.5** | 见表 | 按性别×体脂档查 |
| `{{outfitBlock}}` | **查表 §3.6** | 见表 | 按风格×性别查 |
| `{{stageTitle}}` | 阶段表 | `蜕变可见` | |
| `{{originalOutfit}}` | 视觉提取 | `white BAPE t-shirt, khaki cargo pants` | 保留原图穿着（身材图用） |

### 3.2 身份锚点 `{{identityAnchors}}`（关键创新）

**首次上传时**用视觉模型（StepFun）提取并**永久存档**一段身份描述，后续所有生图都引用同一字符串。这是保脸的关键。

**提取 Prompt**（仅首次调用一次）：

```
请仅凭这张全身照，提取该人物的外貌身份特征，用于后续AI生图保持身份一致。
只描述不改变的特征，不描述身材/穿着。输出一段简洁英文描述，包含：
- 发型与发色
- 肤色与人种倾向
- 脸型与面部轮廓
- 是否戴眼镜及款式
- 明显的面部特征（胡须/痣等）
仅输出一段英文，不超过40词，不要任何额外说明。
```

**存档示例**（即 `{{identityAnchors}}` 的值）：
```
black short fluffy hair, medium-deep Asian skin tone, round face, black framed glasses, clean-shaven, no visible marks
```

### 3.3 Prompt 模板 A —— 视觉体脂评估（Step②）

**模型**：StepFun `step-1o-turbo-vision`（OpenAI 兼容 `/chat/completions`，`response_format=json_object`）

**System（固定）**：
```
你是资深运动科学评估专家，仅凭单张全身照估算体脂率。基于腰腹/手臂/大腿/下颌脂肪分布、肌肉线条可见度判断。输出体脂率(%，1位小数)、置信度confidence(0~1)、可见信号visibleSignals(中文2~4条)。仅输出JSON。
参考范围：男 运动员6~13/健康14~17/平均18~24/偏高25+；女 运动员14~20/健康21~24/平均25~31/偏高32+。
```

**User（固定，仅插值）**：
```
性别：{{gender}}；年龄：{{age}}；身高：{{height}}cm；体重：{{weight}}kg；BMI：{{bmi}}。
请评估体脂率，输出：{"bodyFatEstimate":<number>,"confidence":<0~1>,"visibleSignals":["..."]}。照片见附图。
```

**失败回退**：BMI 公式 `1.2·BMI + 0.23·age − 16.2(男)/5.4(女)`，clamp[3,60]。

### 3.4 Prompt 模板 B —— 阶段身材效果图（Step⑤）

**模型**：**image2**（图生图）。**base** = 最新照；**reference**（如支持）= 起点+中间照。

**Prompt（固定模板，仅插值变量）**：

```
Photorealistic body transformation of the EXACT same person shown in the reference photo.
Keep these identity features ABSOLUTELY IDENTICAL — do NOT alter them in any way:
{{identityAnchors}}, same facial features and bone structure, same height and body frame.

This is a {{age}}-year-old {{genderWord}} currently at approximately {{currentBodyFat}}% body fat.
Transform the body to {{targetBodyFat}}% body fat.
{{bodyDescriptionByTarget}}
The change should be natural and believable as realistic fitness progress.

Strict constraints:
- ONLY change body composition (reduce fat). Identity, skin color, hair, glasses,
  clothing ({{originalOutfit}}), posture, and background MUST stay identical to the base photo.
- Do NOT swap faces. Do NOT change ethnicity. Do NOT go below {{targetBodyFat}}% body fat.
- Natural skin texture, realistic soft shadows, no plastic/smoothed/waxed look.
- Full body visible, standing relaxed, same camera angle as base photo.

Style: ultra-realistic photography, soft natural daylight, sharp focus, 8K detail.
Output a single realistic photo.
```

### 3.4b Prompt 模板 D —— onboarding 终极目标身材图（Step⓪c，北极星）⭐

**模型**：**image2**（图生图）。**base** = 起点照（此时仅有这一张，无中间轨迹）。
**与模板 B 的关键区别**：
1. 跨度最大（startBodyFat → 目标体脂，可能差 15%+），需特别约束"自然可信、不过度理想化"。
2. 无中间参考图，单图变换，身份锚点的作用更关键（必须严锁）。
3. 这是用户看到的"第一张未来图"，是激励系统的北极星，**必须成功生成**（走最高优先级 + 降级链兜底）。

**目标体脂固定为最终目标**：男 12% / 女 20%（或 AI Coach 设定值），即 Stage 6。

**Prompt（固定模板，仅插值变量）**：

```
Photorealistic body transformation of the EXACT same person shown in the reference photo.
This is the person's ULTIMATE FITNESS GOAL — show what they will look like after a complete,
successful transformation. This is the destination that will motivate them to start.

Keep these identity features ABSOLUTELY IDENTICAL — do NOT alter them in any way:
{{identityAnchors}}, same facial features and bone structure, same height and body frame.
The face MUST be recognizably the same person, just leaner.

This is a {{age}}-year-old {{genderWord}} currently at approximately {{startBodyFat}}% body fat.
Transform the body to the FINAL GOAL of {{targetBodyFat}}% body fat — their ideal physique.
{{bodyDescriptionByTarget}}

IMPORTANT — believability constraints for this large transformation:
- This must look like a REALISTIC long-term fitness result (8-12 months of dedicated work),
  NOT an impossible or digitally-faked extreme. Athletic and healthy, not bodybuilder-stage lean.
- The face becomes leaner and more defined (sharper jawline, less fullness) but stays
  recognizably the SAME person — do not swap or idealize the face.

Strict constraints:
- ONLY change body composition (reduce fat, reveal natural muscle). Identity, skin color,
  hair, glasses, clothing ({{originalOutfit}}), posture, and background MUST stay identical
  to the base photo.
- Do NOT swap faces. Do NOT change ethnicity. Do NOT go below {{targetBodyFat}}% body fat.
- Natural skin texture, realistic soft shadows, no plastic/smoothed/waxed/oiled look.
- Full body visible, standing relaxed, same camera angle as base photo.

Style: ultra-realistic photography, soft natural daylight, sharp focus, 8K detail.
Output a single realistic photo.
```

> **onboarding 穿搭图（v4.1 取消）**：~~Step⓪c 生成终极身材图后，复用模板 C（§3.6）生成 3 套穿搭图。~~
> v4.1 起 onboarding **只生成 1 张终极身材图**（模板 D），不再生成穿搭图。

> **偏差说明（对用户诚实）**：onboarding 终极图基于单张起点照生成，偏差最大。
> 建议在 UI 标注："这是基于你当前状态预测的最终目标，随着你持续上传照片，
> 我们会不断修正这个目标的样子，让它越来越接近真实的你。"
> 这样既给动机，又为后续 Step⑤ 的"修正生成"埋下伏笔。

### 3.5 `{{bodyDescriptionByTarget}}` 查表（身材描述）

后端按 `性别 × 目标体脂区间` 查此表填入。

**男性**：

| 目标体脂 | bodyDescriptionByTarget |
|---|---|
| ≥25% | Still soft midsection, rounded belly, minimal muscle definition, noticeable fat on arms and legs. |
| 20–24% | Flatter stomach beginning to show shape, faint waist outline, no visible abs, smoother arms. |
| 16–19% | Clearly flatter firmer stomach, slight arm definition, sharper jawline, leaner face. |
| 13–15% | Visible abdominal outline, defined arms and shoulders, athletic look. |
| 10–12% | Clear abdominal definition (4-pack), vascular arms, sharp jawline, athletic V-taper. |

**女性**：

| 目标体脂 | bodyDescriptionByTarget |
|---|---|
| ≥32% | Soft curves, fuller waist and thighs, no muscle lines. |
| 27–31% | Slightly more defined waist, smoother silhouette, natural tone. |
| 23–26% | Slimmer waist, light arm tone, firmer legs, healthy athletic shape. |
| 20–22% | Toned arms and legs, flat toned stomach, healthy definition. |
| 18–19% | Athletic and lean, defined muscle tone. |

### 3.6 ~~`{{outfitBlock}}` 查表（穿搭描述）+ 穿搭 Prompt 模板 C （Step⑥）~~ **v4.1 已取消**

> **本节整体作废**：v4.1 起取消 Step⑥ 3 套穿搭图（运动 / 通勤 / 度假）生成。
> 下方查表与 Prompt 模板仅保留为历史参考，**后端不得引用**。
> 如未来产品再次需要穿搭功能，可恢复本节内容并恢复 `EvolutionStage.outfitImages` 字段。

<details>
<summary>原 §3.6 内容（仅供参考，不再实现）</summary>

**3 种风格**（用户已测试满意的版本）：运动 `athleisure` / 通勤 `commute` / 度假 `resort`。

**通用 Prompt 框架（固定）**：
```
Photorealistic {{shotType}} photo of the EXACT same person shown in the reference photo.
Keep these identity features ABSOLUTELY IDENTICAL — do NOT alter them in any way:
{{identityAnchors}}, same facial features and bone structure, same height and body frame.

This is a {{age}}-year-old {{genderWord}}, now at {{targetBodyFat}}% body fat:
{{bodyDescriptionByTarget}}

Outfit (designed to HIGHLIGHT the fit physique):
{{outfitBlock}}

Setting: {{sceneBlock}}
Pose: {{poseBlock}}

Strict constraints:
- ONLY the body is transformed (to {{targetBodyFat}}% body fat). Identity, skin color, hair,
  glasses, ethnicity MUST stay identical to the reference.
- Do NOT swap faces. Do NOT over-shred below {{targetBodyFat}}%. Athletic, not bodybuilder.
- Natural skin texture, realistic fabric and lighting, no plastic look. Full body visible.

Style: {{styleBlock}}
Safety: SFW, tasteful, non-sexualized, all-ages appropriate.
Output a single realistic photo.
```

**风格查表**（`{{shotType}}` `{{outfitBlock}}` `{{sceneBlock}}` `{{poseBlock}}` `{{styleBlock}}`）：

#### 风格 1：运动型男 `athleisure`（凸显上半身线条）

| 字段 | 男 | 女 |
|---|---|---|
| outfitBlock | A fitted charcoal-grey or black compression-style tank top (muscle tank) that hugs the torso and clearly reveals shoulders, chest, and arm definition. Paired with fitted black athletic joggers on toned legs. Clean minimalist running shoes. | A fitted sports bra plus high-waist athletic leggings, sleek ponytail, running shoes. Toned arms and midriff visible, outfit hugs the athletic silhouette. |
| sceneBlock | modern bright gym or rooftop with urban backdrop, energetic confident mood | bright modern gym or outdoor running track, energetic mood |
| poseBlock | relaxed but confident, slight smile, one hand on hip | dynamic natural pose, slight smile, confident |
| styleBlock | fitness editorial photography, crisp natural light, sharp focus, 8K detail | fitness editorial, crisp natural light, high detail |
| shotType | fashion | fashion |

#### 风格 2：通勤精英 `commute`（穿衣显瘦的高级感）

| 字段 | 男 | 女 |
|---|---|---|
| outfitBlock | A well-fitted light-blue or white dress shirt, SLIM FIT, tailored close so broadened shoulders, lean chest, and trim waist are visible through the fabric. Top two buttons open, sleeves rolled up to reveal defined forearms. Tucked into tailored dark navy trousers with a leather belt emphasizing the V-taper. Leather dress shoes. | A tailored blouse or fitted blazer over a top, knee-length pencil skirt or tailored trousers, elegant and professional. Slim fit that flatters the fitter, leaner silhouette. |
| sceneBlock | modern office lobby or upscale urban street, confident professional mood | modern office building lobby, elegant professional mood |
| poseBlock | standing tall, one hand in trouser pocket, relaxed confident smile | standing tall and upright, one hand relaxed, confident smile |
| styleBlock | menswear editorial / GQ-style fashion photography, soft natural daylight, sharp focus, 8K detail | fashion editorial photography, soft natural daylight, sharp focus |
| shotType | fashion | fashion |

#### 风格 3：度假自信 `resort`（终极身材展示）

| 字段 | 男 | 女 |
|---|---|---|
| outfitBlock | An open unbuttoned white linen shirt (optional) with mid-thigh swim trunks (navy or dark grey). Lean defined torso, visible abdominal definition, athletic V-taper are the focal point. Barefoot on sand. | A tasteful one-piece or two-piece swimsuit with a light cover-up. Toned lean physique shown with confidence, tasteful and stylish. |
| sceneBlock | sunny tropical beach or resort poolside, turquoise water, golden hour light | sunny tropical beach, golden hour light, blue water background |
| poseBlock | confident relaxed stance, slight smile, walking along the shore | confident relaxed stance, slight smile, natural |
| styleBlock | travel/lifestyle editorial photography, warm golden hour lighting, vivid but realistic, sharp focus, 8K detail | travel/lifestyle editorial, warm golden lighting, vivid realistic colors |
| shotType | lifestyle | lifestyle |

> **安全后缀**已内置于通用框架末尾。`resort` 女性泳装需特别确保 SFW，入库前建议二次审核。

</details>

---

## 四、多级保底策略（Degradation Chain）⭐ 重点（v4.1 精简）

> 设计目标：**image2 任何环节失败、国内网络不通、额度耗尽**——用户都拿不到白屏，始终看到有意义的内容。按"成本从低到高、效果从好到弱"逐级回退。
>
> **v4.1 调整**：L1 由"多 provider 枚举"精简为**单一保底 nano banana 2**。运维心智更轻，配置项更少。

### 4.1 降级链总览

```
[生图请求]
   │
   ▼
L0 主链路：image2（GPT image2，OpenAI 兼容）
   │ 失败/超时/额度不足/Key 失效
   ▼
L1 保底：nano banana 2（同协议热切换，不改 Prompt）
   │ 仍失败
   ▼
L2 降级内容：复用上一阶段已生成的图 + 数据可视化（体脂曲线/进度环）
   │ 历史也无图
   ▼
L3 兜底：展示用户真实上传历史照 + 鼓励文案 + 占位插画
   （永不白屏）
```

### 4.2 各级触发条件与策略

#### L0 —— 主模型 image2（GPT image2）

- **前提**：image2 为 OpenAI 兼容端点；如国内不可直连，配置 `IMAGE_GEN_PROXY_URL` 走代理。
- **超时**：单张 60s。
- **重试**：网络类错误指数退避重试 2 次（3s、9s）。
- **降级触发**：连续失败 / 返回 429(限流) / 401(额度/Key失效) / 5xx。

#### L1 —— 保底模型 nano banana 2（同协议热切换）

当 L0 失败，**不改 Prompt**，仅切换 `BASE_URL/KEY/MODEL` 到 nano banana 2（OpenAI 兼容）：

| 字段 | 主（L0 image2） | 保底（L1 nano banana 2） |
|---|---|---|
| BASE_URL | `IMAGE_GEN_BASE_URL` | `IMAGE_GEN_FALLBACK_BASE_URL` |
| API_KEY | `IMAGE_GEN_API_KEY` | `IMAGE_GEN_FALLBACK_API_KEY` |
| MODEL | `IMAGE_GEN_MODEL` | `IMAGE_GEN_FALLBACK_MODEL` |
| 代理 | `IMAGE_GEN_PROXY_URL` | `IMAGE_GEN_FALLBACK_PROXY_URL`（可选） |

```env
# 主链路 L0：image2
IMAGE_GEN_BASE_URL=https://api.openai.com/v1
IMAGE_GEN_API_KEY=sk-...
IMAGE_GEN_MODEL=gpt-image-2
IMAGE_GEN_PROXY_URL=

# 保底 L1：nano banana 2
IMAGE_GEN_FALLBACK_BASE_URL=https://<provider-of-nano-banana>/v1
IMAGE_GEN_FALLBACK_API_KEY=<your-nano-banana-key>
IMAGE_GEN_FALLBACK_MODEL=nano-banana-2
IMAGE_GEN_FALLBACK_PROXY_URL=
```

> **Prompt 兼容性**：本策略 Prompt 全部为纯文本，OpenAI 兼容图像接口通用，无需改写。reference 多图能力差异由后端探测：不支持多图则退化为单 base + 文字描述。

#### L2 —— 内容降级（无生图，但不空）

当 L0+L1 全部不可用（如所有 API Key 失效），**不生图**，改为：
- **身材图**：复用该用户**上一阶段**已生成的身材图（标注"基于上一阶段预估"），或北极星终极图。
- **主视觉**用 **数据可视化**替代：
  - 体脂下降曲线（真实历史 + 预测虚线）
  - 阶段进度环（当前/目标）
  - "预测 vs 实际"对比条
- 文案："AI 画师暂时休息，但你的进步是实打实的：已减脂 X%，距离下个目标约 Y 天。"

> **onboarding 北极星的特殊降级**：新用户首次 onboarding 时若 L0+L1 全挂，此时无任何历史图可复用，走 L3（见下）。但**北极星是最高优先级**，建议：① onboarding 生图任务入持久队列，一旦 API 恢复立即补生成并推送；② 前端展示骨架屏 + "正在为你绘制未来的你…"文案，而非直接报错。

> L2 不消耗任何 AI 额度，纯前端/后端计算，**永远可用**。

#### L3 —— 终极兜底

连历史生成图都没有（新用户首次解锁就遇故障）：
- 展示**用户真实上传的照片历史**（时间轴对比，自带"肉眼可见的变化"）
- 鼓励文案 + 本地静态占位插画（打包在前端 assets，不依赖网络）
- 入口提示"正在为你生成专属效果图，稍后回来查看"，生成任务入队列，恢复后异步补发。

### 4.3 国内网络/国外模型专项策略

> 用户痛点：国内网络无法直连国外模型 API。

| 场景 | 策略 |
|---|---|
| image2 是国外端点 | 配置 `IMAGE_GEN_PROXY_URL` 走代理；后端代理，Key 不进前端 |
| nano banana 走国内端点 | 直连，作为 L1 自然兜底 |
| 全链路国内不通 | 触发 L1→L2→L3 |

**架构原则**（呼应 AGENTS.md）：
- 付费 AI provider 一律**后端集成**，Key 不进浏览器 bundle。
- 前端只调自有后端 `/api/image-gen/*`，后端内部决定走 L0 还是 L1。

### 4.4 API 额度耗尽应急策略

| 信号 | 应对 |
|---|---|
| L0（image2）429/余额不足 | 自动切换到 L1（nano banana 2） |
| L0+L1 都额度耗尽 | 触发 L2（数据可视化），生图任务**入持久队列** |
| 队列堆积 | 按"用户价值/解锁紧急度"排序；额度恢复后按序补生成并推送通知 |
| 成本护栏 | 每用户每日/每月生图配额上限；超额转为 L2 + 提示"明日可继续生成" |

**配额建议**（v4.1 修订）：
- onboarding 北极星：1 张（仅终极身材，预留 1 张重试）—— **注册时必生，最高优先级**
- 每次解锁：1 张（仅身材，预留 1 张重试）
- 单用户每月上限：8 张（含 onboarding）
- 全局并发：限制为 provider 并发上限的 80%


### 4.5 失败用户感知设计

| 情况 | 用户看到 |
|---|---|
| 正常 | 生成的图 |
| L0→L1 切换中（用户无感） | loading 动画（"正在绘制未来的你…"，≥10s） |
| 走到 L2 | 数据可视化 + "效果图将在 N 分钟内补全" |
| 走到 L3 | 真实照片对比 + 鼓励文案 |

> 关键：**永远不让用户感知到"错误"**，所有降级都包装成"正在准备/换种方式展示"。

---

## 五、数据模型（Prisma 建议）

```prisma
model BodyFatAssessment {
  id               String   @id @default(cuid())
  userId           String
  recordId         String   @unique
  photoUrl         String
  bodyFatEstimate  Float
  bmiBodyFat       Float?
  confidence       Float
  visibleSignals   Json?
  assessedAt       DateTime @default(now())
}

model UserIdentityProfile {
  userId              String   @id
  identityAnchors     String           // §3.2 提取的身份锚点，一次存档全程复用
  originalOutfit      String?          // 首次穿着描述
  startBodyFat        Float?           // 起点体脂
  // 北极星（onboarding Step⓪c 生成，最高优先级）
  northStarBodyUrl    String?          // 终极目标身材图（基于起点照直接生成）
  northStarOutfits    Json?            // 终极目标穿搭图 { athleisure, commute, resort } -> url
  northStarStatus     String  @default("pending")  // pending|done|failed|fallback
  extractedAt         DateTime @default(now())
}

model EvolutionStage {
  userId           String
  stageIndex       Int
  targetBodyFat    Float
  title            String
  previewImageUrl  String?          // Step⑤ 身材图
  outfitImages     Json?            // Step⑥ { athleisure, commute, resort } -> url
  isUnlocked       Boolean  @default(false)
  actualImageUrl   String?
  generationMeta   Json?            // 记录 provider/prompt/耗时/降级级别，便于复盘
  @@unique([userId, stageIndex])
}

model ImageGenTask {                // 异步队列，支持 L2 补发
  id        String   @id @default(cuid())
  userId    String
  stageIndex Int?
  style     String                  // 'northstar' | 'northstar-athleisure' | 'northstar-commute' | 'northstar-resort' | 'stage' | 'athleisure' | 'commute' | 'resort'
  provider  String                  // 实际用到的 provider（含降级）
  promptText String  @db.Text
  status    String   @default('pending') // pending|done|failed|fallback
  resultUrl String?
  error     String?
  createdAt DateTime @default(now())
}
```

---

## 六、测试矩阵（验证 Prompt 与降级）

### 6.1 生图质量
| 用例 | 验收 |
|---|---|
| **onboarding 北极星身材图（27%→12%）** | **脸一致、跨度大但可信（非极端）、有激励感** |
| **onboarding 北极星穿搭图（3套）** | **基于终极身材、SFW、强动机** |
| 20% 身材图 | 脸一致、略瘦、无畸变 |
| 16% 身材图 | 明显更瘦、脸一致 |
| 12% 身材图 | 腹肌轮廓、脸一致、不夸张 |
| 运动穿搭 | 显上半身、SFW |
| 通勤穿搭 | 合身显身材 |
| 度假穿搭 | SFW、自信 |
| 跨阶段身份一致 | 多张图脸相似度≥0.6（含北极星图） |

### 6.2 降级链
| 用例 | 验收 |
|---|---|
| image2 Key 失效 | 自动切 L1 备用 |
| 全 provider 限额 | 转 L2 数据可视化，不报错 |
| **onboarding 即全故障** | **骨架屏+文案，任务入队列，恢复后补发推送，不白屏** |
| 首次解锁即全故障 | L3 真实照片+文案，不白屏 |
| 超时 60s | 触发重试→切换 |

---

## 七、与现有代码的落地差异

| 现状 | v3 目标 | 改动 |
|---|---|---|
| `.env` 全占位符 | 接入 image2 + 备用链 | 配 L0/L1 多 provider |
| 单 provider | 多 provider 降级链 | `image-gen.module.ts` 加 fallback 遍历 |
| 只生下阶段1张 | 1身材+3穿搭 | 扩展生成 + outfitImages |
| 单图生成 | 多图融合 | 收集起点/中间/最新 ref |
| 无身份锚点 | 提取并存档 | 新增 UserIdentityProfile + 首次提取 |
| **无 onboarding 终极目标图** | **Step⓪ 北极星：注册即生终极身材+3穿搭** | **新增 onboarding 生图流程 + northStar* 字段 + 模板 D** |
| Prompt 散落硬编码 | 本文件为单一事实源 | 后端按模板+查表插值实现 |
| 无降级 | L0→L3 | 新增队列 + 数据可视化 fallback |

---

## 八、代码接入指南（给实现者的精确地图）⭐⭐⭐

> **本章用途**：供任何 AI 或开发者读完即可精确改码，无需再翻代码。所有 `file:line` 均为现有代码绝对定位，改动指令精确到函数/字段。
> **架构速览**：后端 NestJS + Prisma(PostgreSQL)，全局前缀 `api`，所有返回自动包成 `{success,data}` 信封；前端 React + Vite，axios 自动拆信封。

### 8.1 现有架构关键约定（改码前必读）

| 约定 | 位置 | 说明 |
|---|---|---|
| 全局前缀 `api` | `backend/src/main.ts:14` | 所有路由实际为 `/api/xxx` |
| 响应信封 `{success,data}` | `backend/src/common/interceptors/response.interceptor.ts:9-28` | Controller 只返回 data，拦截器自动包装 |
| 前端拆信封 | `frontend/api/client.ts:21-27` | axios 拦截器自动剥到 `res.data.data` |
| JWT 鉴权 | 所有业务 Controller 挂 `@UseGuards(JwtAuthGuard)` | 用 `@CurrentUser() user:{sub:string}` 取 userId |
| 环境变量加载 | `backend/src/app.module.ts:24-27` | `ConfigModule.forRoot({isGlobal:true, envFilePath:['.env.local','.env']})`，**`.env.local` 优先** |
| 上传目录 | `process.cwd()/uploads`，URL 形如 `/uploads/<filename>` | `backend/src/common/upload.util.ts:5,30-32` |
| 静态目录挂载 | `main.ts:39` | `useStaticAssets(UPLOADS_DIR,{prefix:'/uploads/'})` |
| body limit | `main.ts:15-16` | 15mb（支持 base64 直传） |
| ValidationPipe | `main.ts:40-45` | `{whitelist:true,transform:true}`——**未声明字段会被剥除**，新字段必须同步白名单 |

---

### 8.2 图像生成模块现状（你的主战场）

**单文件**：`backend/src/image-gen/image-gen.module.ts`（361 行，含 Service+Controller+Module）

#### 核心方法 `generateIdealBody`（`:75-104`）

```ts
// 签名
generateIdealBody(userId: string, data: IdealBodyGenerateInput): Promise<{ image: string; taskId: string | null }>
// 入参类型（:19-24）
interface IdealBodyGenerateInput {
  prompt?: string;
  currentImageBase64?: string;   // 有值→走 /images/edits（图生图）
  referenceImageBase64?: string; // 可选参考图
  size?: string;                 // 1024x1024|1024x1536|1536x1024|auto
}
// 返回 { image: 'data:image/png;base64,...' 或 url, taskId }
```

**内部调用链**：`getImageProviderConfig`(配置) → `createTaskSafely`(落库) → 有 base64 则 `requestImageEdit` 否则 `requestImageGeneration` → `extractProviderImage`(解析 b64_json/url) → `updateTaskSafely`。

**⚠️ 已知缺陷**：`generateIdealBody` 生成图后**只更新 task.status，不回写 `resultImageUrl`**（`:89-91`）。`evolution-stage.service.ts:616-628` 的 `getLatestGeneratedIdealImage` 查 `resultImageUrl` 给 stage0 做 preview——**因此 stage0 的 preview 实际取不到图**。实现新策略时必须修复此处（成功后回写 `resultImageUrl`）。

#### Provider 配置 `getImageProviderConfig`（`:106-135`）

| 字段 | 主变量 | 备用变量 | 默认 |
|---|---|---|---|
| apiKey | `IMAGE_GEN_API_KEY` | `CODEX_API_KEY` | 空→抛异常 |
| baseUrl | `IMAGE_GEN_BASE_URL` | `CODEX_BASE_URL` | `https://api.openai.com/v1` |
| model | `IMAGE_GEN_MODEL` | `CODEX_IMAGE_MODEL` | `gpt-image-2` |
| size | 入参 | — | `1024x1024` |

**接入 image2 + 降级链的改法**：保留 `getImageProviderConfig` 取主配置（L0）；新增 `getImageProviderConfigs()` 返回**有序数组**（L0→L1），遍历尝试。备用 provider 从 `IMAGE_GEN_FALLBACK_BASE_URLS/API_KEYS/MODELS`（逗号分隔）读取。

#### HTTP 调用方式

- **用全局 `fetch`**（Node 18+ 内置），代理走 undici：`proxyFetch`（`:301-310`）读 `IMAGE_GEN_PROXY_URL` → `ProxyAgent`。
- **生成**：`POST {baseUrl}/images/generations`，JSON `{model,prompt,n:1,size,response_format:'b64_json'}`
- **编辑**：`POST {baseUrl}/images/edits`，**FormData**：`image`=base64 Blob(filename `body.png`)，可选第二个 `image`=reference(filename `reference.png`)，`prompt/model/n/size/response_format`
- **返回解析** `extractProviderImage`（`:239-261`）：优先 `data[0].b64_json`→`data:image/png;base64,...`，否则 `data[0].url`

#### Controller 路由（`:313-354`，`@Controller('image-gen')`）

| 方法 | 路由 | 入参 |
|---|---|---|
| POST | `/api/image-gen` | `{sourceImageUrl?,targetStyle?,prompt?}` |
| POST | `/api/image-gen/ideal-body` | `IdealBodyGenerateInput` |
| GET | `/api/image-gen` | 列表 10 条 |
| GET | `/api/image-gen/:id` | 单条 |
| PATCH | `/api/image-gen/:id` | `{status,resultImageUrl?,errorMessage?}` |

> **新增穿搭/北极星路由建议**：在此 Controller 加 `POST /api/image-gen/stage-preview`、`POST /api/image-gen/outfit`、`POST /api/image-gen/northstar`，或在 evolution-stage 模块内加生成端点。

---

### 8.3 身材演变模块现状（你要扩展的核心）

**文件**：`backend/src/evolution-stage/evolution-stage.service.ts`（670 行）

#### 关键方法与行号

| 方法 | 行号 | 签名/用途 | 新策略接入点 |
|---|---|---|---|
| `getStages` | `:60-103` | `(userId)→{stages,currentBodyFat}` | 返回需加 `outfitImages` 字段 |
| `assessUpload` | `:105-219` | `(userId,recordId)→{bodyFat,isGeminiCalibrated}` | ②③④逻辑所在，达标后触发⑤⑥ |
| `getPrediction` | `:221-304` | `(userId,scenario?)→PredictionResult` | 加"预测vs实际"对比 |
| `initializeStages` | `:413-478`(private) | `(userId,gender)` 建7阶段 | `buildStageTargets` 改减速曲线 |
| `checkUnlock` | `:508-588`(private) | 解锁判定（连续2次+24h） | 解锁后触发北极星更新/穿搭生成 |
| **`generateNextStagePreview`** | **`:306-361`(private)** | **预览图生成入口** | **替换为模板B+模板C⑤⑥** |

#### `generateNextStagePreview` 现状（`:306-361`）—— 你要重写的核心

```ts
// 现有逻辑（简版）
generateNextStagePreview(userId, recordImageUrl):
  if (!this.imageGenService) return
  nextStage = prisma.evolutionStage.findFirst({where:{userId,isUnlocked:false},orderBy:{stageIndex:'asc'}})
  if (!nextStage) return
  if (nextStage.previewImageUrl && isGenStageUrl(nextStage.previewImageUrl)) return  // 已生成跳过
  dataUrl = await imageUrlToDataUrl(recordImageUrl)
  prompt = [硬编码英文].join(' ')   // :328-336 ← 替换为模板B
  result = await this.imageGenService.generateIdealBody(userId, {prompt, currentImageBase64:dataUrl})
  savedUrl = saveBase64Image(result.image)   // 写 /uploads/gen-stage-*.png
  prisma.evolutionStage.update({where:{id:nextStage.id}, data:{previewImageUrl:savedUrl}})
```

**新策略要改**：
1. prompt 换成**模板 B**（§3.4），用 `{{identityAnchors}}` 等变量插值
2. 收集多图 reference（起点+中间），传入 `referenceImageBase64`
3. 生成完身材图后，**并行调用 3 次模板 C** 生成穿搭图，存入 `outfitImages` JSON 字段
4. 解锁的是 stage 6 时，对比更新北极星图（用真实轨迹修正）

#### 常量定义（`:36-48`）—— 改阶段策略的位置

```ts
const STAGE_COUNT = 7;              // :36
const QUALIFIED_REQUIRED = 2;       // :37
const QUALIFIED_INTERVAL_HOURS = 24;// :38
const STAGE_TITLES = [...];         // :40-48  七个标题
```

`buildStageTargets`（`:590-610`）当前线性等分 → 改为减速曲线（见 §2.1）。

#### 辅助方法（可复用）

| 方法 | 行号 | 用途 |
|---|---|---|
| `imageUrlToDataUrl` | `:363-394` | 图片URL→base64 dataURL（支持 data:/http/本地） |
| `saveBase64Image` | `:396-407` | base64→写 `/uploads/gen-stage-<ts>-<rand>.png`，返回 URL |
| `resolveStageEndpoints` | `:480-506` | 取 start/target 体脂（读 AiCoachAssessment.targetBodyFatEstimate） |
| `calculateBodyFatFromUser` | `:643-669` | BMI 公式回退 |
| `normalizeBodyFat` | `:639-641` | clamp[3,60] |

#### Controller 路由（`evolution-stage.controller.ts`）

| 方法 | 路由 | 行号 |
|---|---|---|
| GET | `/api/evolution-stage` | `:11-14` |
| POST | `/api/evolution-stage/assess/:recordId` | `:16-19` |
| GET | `/api/evolution-stage/prediction` | `:21-29` |

> `EvolutionStageModule`（`evolution-stage.module.ts:1-13`）imports `[AiModule, ImageGenModule]`，已注入 `ImageGenService`——**可直接调用，无需额外接线**。

---

### 8.4 AI 服务现状（体脂评估 + 身份锚点）

**文件**：`backend/src/ai/ai.service.ts`（458 行）

#### 现有方法

| 方法 | 行号 | 用途 | 新策略关联 |
|---|---|---|---|
| `estimateBodyFatFromImage` | `:151-169` | Step② 视觉估体脂 | **直接复用**，Prompt 换成模板A |
| `requestVision` | `:262-347` | StepFun 视觉调用底层 | 身份锚点提取复用此方法 |
| `requestGemini` | `:349-392` | 文本 LLM | — |
| `requestDeepSeek` | `:394-442` | 文本 LLM（优先于 Gemini） | — |

#### `estimateBodyFatFromImage` 现状（`:151-169`）

```ts
async estimateBodyFatFromImage(imageUrl: string): Promise<number>
// 内部：imageUrlToDataUrl → requestVision(systemPrompt, userPrompt, dataUrl) → parseJsonResponse
// systemPrompt(:153-157) 和 userPrompt(:158-159) 都是硬编码 → 替换为模板A
// 返回纯 number，丢失了 confidence/visibleSignals → 建议升级返回对象
```

**新策略改动**：把 systemPrompt/userPrompt 换成**模板 A**（§3.3），返回值从 `number` 升级为 `{bodyFatEstimate, confidence, visibleSignals}`。

#### ⚠️ 身份锚点提取——需新增

**当前不存在**任何身份/外貌特征提取方法。需在 `ai.service.ts` 新增：

```ts
// 建议新增方法（仿 estimateBodyFatFromImage:151-169 的模式）
async extractIdentityAnchors(imageUrl: string): Promise<string>
// 用 requestVision(:262) + §3.2 提取 Prompt
// 返回存档用的英文描述字符串（如 "black short hair, Asian skin, round face, glasses"）
```

**StepFun 视觉调用配置**（`requestVision:262-347`）：
- key = `STEPFUN_API_KEY` ?? `DIET_VISION_API_KEY`（`:268-271`）
- baseUrl = `STEPFUN_BASE_URL` ?? `DIET_VISION_BASE_URL` ?? `https://api.stepfun.com/v1`（`:274-280`）
- model = `BODY_FAT_VISION_MODEL` ?? `DIET_VISION_MODEL` ?? `step-1o-turbo-vision`（`:282-286`）
- POST `{baseUrl}/chat/completions`，messages 含 image_url，`response_format:{type:'json_object'}`

---

### 8.5 Prisma Schema 现状与改动

**文件**：`backend/prisma/schema.prisma`（498 行）

#### 现有模型（无需新建，直接扩展）

| 模型 | 行号 | 现有字段 | 新策略需加字段 |
|---|---|---|---|
| `User` | `:10-55` | gender,height,weight,age,bodyStyle,userImage,userFaceImage,idealBodyImage,isProfileComplete | 无（身份锚点建议独立模型） |
| `EvolutionStage` | `:183-201` | stageIndex,targetBodyFat,title,previewImageUrl,isUnlocked,actualImageUrl,qualifiedCount | **+outfitImages Json?**（{athleisure,commute,resort}）,**+generationMeta Json?** |
| `EvolutionAssessment` | `:203-216` | recordId, bodyFatEstimate, geminiBodyFat, isGeminiCalibrated, assessmentCount | **+confidence Float?**,**+visibleSignals Json?** |
| `ImageGenTask` | `:275-289` | status,sourceImageUrl,targetStyle,prompt,resultImageUrl,errorMessage | **+style String?**（northstar/stage/athleisure/...）,**+provider String?** |
| `AiCoachAssessment` | `:309-325` | targetBodyFatEstimate | 无（被 `resolveStageEndpoints` 读取作目标） |

#### 需新建模型

```prisma
// 身份锚点（§3.2）+ 北极星（§Step⓪）—— 新建
model UserIdentityProfile {
  userId              String   @id
  identityAnchors     String           // 身份锚点描述，全程复用
  originalOutfit      String?          // 首次穿着描述
  startBodyFat        Float?
  northStarBodyUrl    String?          // 北极星终极身材图
  northStarOutfits    Json?            // {athleisure,commute,resort}
  northStarStatus     String   @default("pending")
  extractedAt         DateTime @default(now())
  user                User     @relation(fields:[userId],references:[id])
}
```

> **User 模型需加反向关系**：在 `User`（`:10-55`）的关系区加 `userIdentityProfile UserIdentityProfile?`。

#### 迁移命令

```bash
cd backend
npx prisma migrate dev --name add_identity_and_outfits  # 生成迁移+应用
npx prisma generate                                     # 重新生成 client
npm run start:dev                                       # 重启（watch会自动）
```

---

### 8.6 前端改动地图

#### API 层

| 文件 | 改动 |
|---|---|
| `frontend/api/image-gen.ts`（43行） | 加 `generateStagePreview`/`generateOutfit`/`generateNorthStar` 方法（仿 `generateIdealBody:39-42`，timeout 120s） |
| `frontend/api/evolution-stage.ts`（130行） | `StageItem` 接口加 `outfitImages?`；加 `getNorthStar()` 方法 |
| `frontend/api/user.ts:3-20` | `UserProfile` 加 `userIdentityProfile?` 字段（否则被 whitelist 剥除） |
| `frontend/api/index.ts:1-19` | ⚠️ 当前**未 re-export evolutionStageApi**，需补 `export * from './evolution-stage'` |

#### Service 层

| 文件 | 改动 |
|---|---|
| `frontend/services/gemini.ts:1322-1421` `generateIdealBody` | 新增 `generateStageBody`/`generateOutfit` 变体函数，prompt 从后端获取（不再前端拼） |
| `frontend/services/gemini.ts:1736-1804` `assessBodyFatFromImages` | 可迁移到后端（统一走 StepFun） |

#### UI 层

| 文件 | 现状 | 改动 |
|---|---|---|
| `frontend/App.tsx:346-379` EvolutionEngine | 前端调 `generateIdealBodyAll3` | **改为调后端 `/image-gen/northstar`**，后端做身份提取+北极星生成 |
| `frontend/views/EvolutionProgress.tsx` | 蛇形时间线 | 节点加穿搭图入口；加北极星置顶展示 |
| `frontend/views/EvolutionRecord.tsx:120-141` | 上传→assess | 无需大改，后端 assessUpload 自动触发生成 |

#### onboarding 流程改造（`App.tsx`）

现状：`handleOnboardingComplete`（`:289-320`）→ EvolutionEngine → 前端 `generateIdealBodyAll3` → 选图 → `setIdealBodyImage`。

**新策略**：onboarding 完成时改为调后端 `POST /api/image-gen/northstar`（传 userImage），后端执行 Step⓪a（提取锚点）+ ⓪b（估体脂）+ ⓪c（生终极图+3穿搭），返回结果。前端展示北极星画廊。

---

### 8.7 完整改动清单（按执行顺序）

#### Phase 1：数据层
1. `schema.prisma`：新建 `UserIdentityProfile`；`EvolutionStage` 加 `outfitImages`/`generationMeta`；`EvolutionAssessment` 加 `confidence`/`visibleSignals`；`ImageGenTask` 加 `style`/`provider`；`User` 加反向关系
2. `npx prisma migrate dev` + `npx prisma generate`

#### Phase 2：AI 服务层（`ai.service.ts`）
3. 新增 `extractIdentityAnchors(imageUrl)`（§3.2 Prompt + `requestVision:262`）
4. 升级 `estimateBodyFatFromImage` 返回对象 + 换模板 A Prompt
5. 新增 Prompt 常量模块（模板 A/B/C/D + §3.5/§3.6 查表函数）

#### Phase 3：图像生成层（`image-gen.module.ts`）
6. 修复 `generateIdealBody:89-91` 回写 `resultImageUrl`
7. `getImageProviderConfig` → 新增 `getImageProviderConfigs()` 返回有序数组（L0+L1 降级链）
8. 新增 `generateWithFallback()` 方法（遍历 provider，首个成功即用，记录实际 provider）
9. 新增 `generateStageBody()`/`generateOutfit()`/`generateNorthStar()` 方法（用模板+变量插值）

#### Phase 4：演变逻辑层（`evolution-stage.service.ts`）
10. `buildStageTargets:590-610` 改减速曲线
11. 重写 `generateNextStagePreview:306-361`：模板 B 身材图 + 并行模板 C 三套穿搭 → 存 `previewImageUrl` + `outfitImages`
12. `assessUpload` 达标分支：触发 Step⑤⑥（多图融合，收集起点+中间+最新 ref）
13. `getStages:60-103` 返回值加 `outfitImages`
14. 新增 `generateNorthStar(userId, startImageUrl)`：Step⓪ 完整流程

#### Phase 5：Controller 层
15. `image-gen.module.ts:313-354` 加路由：`POST /northstar`、`POST /stage-preview`、`POST /outfit`
16. 或在 `evolution-stage.controller.ts` 加 `POST /:stageIndex/generate`

#### Phase 6：配置层
17. `backend/.env` 加 `IMAGE_GEN_FALLBACK_*`、确认 `IMAGE_GEN_*` 接 image2
18. `.env.example` 补全所有实际用到的变量

#### Phase 7：前端层
19. `api/image-gen.ts` 加新 API 方法
20. `api/evolution-stage.ts` 的 `StageItem` 加 `outfitImages`
21. `api/user.ts` 的 `UserProfile` 加 `userIdentityProfile`
22. `api/index.ts` 补 re-export evolutionStageApi
23. `App.tsx` onboarding 改调后端 northstar
24. `EvolutionProgress.tsx` 加穿搭画廊 + 北极星展示

---

### 8.8 环境变量完整清单（接入后应配置）

```env
# === 图像生成 L0 主（image2）===
IMAGE_GEN_BASE_URL=<image2 的 OpenAI 兼容端点>
IMAGE_GEN_API_KEY=<image2 key>
IMAGE_GEN_MODEL=image2
IMAGE_GEN_PROXY_URL=

# === 图像生成 L1 备用（降级链，逗号分隔，按序尝试）===
IMAGE_GEN_FALLBACK_BASE_URLS=https://ark.cn-beijing.volces.com/api/v3,https://dashscope.aliyuncs.com/compatible-mode/v1
IMAGE_GEN_FALLBACK_API_KEYS=<fb_key_1>,<fb_key_2>
IMAGE_GEN_FALLBACK_MODELS=seedream,wanx2.1

# === 视觉模型（体脂评估 + 身份锚点提取）===
STEPFUN_BASE_URL=https://api.stepfun.com/v1
STEPFUN_API_KEY=<stepfun key>
BODY_FAT_VISION_MODEL=step-1o-turbo-vision
```

---

### 8.9 数据流全景（实现后）

```
用户上传照片
  │ POST /api/evolution (multipart file)  [evolution.module.ts:151]
  ▼
EvolutionService.create → 写 EvolutionRecord
  │ fire-and-forget assessUpload(recordId)  [evolution.module.ts:59]
  ▼
EvolutionStageService.assessUpload  [:105]
  │ ① aiService.estimateBodyFatFromImage → BodyFatAssessment  [:155]
  │ ② checkUnlock  [:508]
  │    ├─ 未达标 → 返回进度
  │    └─ 达标 → 解锁 stage
  ▼ (解锁时)
generateNextStagePreview  [:306]  ← 重写为 ⑤+⑥
  │ 收集 ref 图（起点+中间+最新）
  │ 模板B插值 → imageGenService.generateWithFallback → previewImageUrl
  │ 并行 模板C×3 → outfitImages {athleisure,commute,resort}
  │ 降级：L0 image2 失败→L1备用→L2复用旧图→L3真实照
  ▼
prisma.evolutionStage.update (previewImageUrl + outfitImages)
  │
  ▼
前端 GET /api/evolution-stage → 展示身材图 + 穿搭画廊
```

---

*本文件为身材演变生图系统的单一事实源。Prompt 任何变更须在此文档更新版本号并重跑 §6 测试矩阵。代码接入须严格遵循 §8 的 file:line 定位与改动清单。*
