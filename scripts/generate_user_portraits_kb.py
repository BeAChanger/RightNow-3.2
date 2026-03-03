from __future__ import annotations

import json
from pathlib import Path


OUT_PATH = Path(r"E:\rightnow-fitness (1)\knowledge\user_portraits_kb_coach_build.xml")
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

goal_map = {"fat_loss": "减脂塑形", "recomposition": "体态重塑", "muscle_gain": "增肌构建"}
exercise_map = {"novice": "新手", "intermediate": "中级", "advanced": "高级"}
medical_map = {
    "none": "无明显疾病史",
    "old_injury": "有旧伤需规避",
    "chronic_condition": "有慢性病管理需求",
    "severe_rehab": "处于严重伤病恢复期",
    "postpartum_recovery": "处于孕产后恢复阶段",
    "age_50_plus": "50岁以上体能维护阶段",
}
location_map = {"home": "家里", "gym": "健身房", "outdoor": "户外"}
time_map = {
    "early_morning_before_breakfast": "早餐前清晨",
    "after_breakfast_morning": "早餐后上午",
    "before_lunch_midday": "午饭前",
    "after_lunch_afternoon": "午饭后",
    "before_dinner_evening": "晚饭前",
    "after_dinner_evening": "晚饭后",
    "flexible_fragmented": "碎片化时段",
}
diet_map = {
    "vegetarian": "素食为主",
    "high_protein": "高蛋白取向",
    "irregular": "饮食不规律",
    "balanced": "均衡饮食",
    "restriction_based": "有明确忌口/限制",
}
occupation_map = {
    "sedentary": "久坐办公",
    "physical_work": "体力劳动",
    "student": "学生",
    "shift_worker": "轮班/夜班",
    "frequent_travel": "高频出差",
}
body_fat_map = {"low": "低", "mid_low": "中偏低", "mid": "中", "mid_high": "中偏高", "high": "高"}
bmi_map = {
    "normal": "正常",
    "normal_high": "正常偏高",
    "overweight": "超重",
    "obese_class_1": "肥胖I级",
    "obese_class_2": "肥胖II级",
}
bmr_map = {"low": "低", "medium_low": "中偏低", "medium": "中", "medium_high": "中偏高", "high": "高"}
equipment_map = {
    "bodyweight+mat": "徒手+瑜伽垫",
    "dumbbell+resistance_band": "哑铃+弹力带",
    "barbell+machine+cardio_zone": "杠铃+器械+有氧区",
    "machine_priority+guided_equipment": "固定器械为主",
    "running+stairs+park_bar": "跑步+楼梯+公园单杠",
    "adjustable_dumbbell+bench": "可调哑铃+训练凳",
    "bodyweight+pelvic_floor_band": "徒手+骨盆底弹力带",
    "light_machine+core_stability_tools": "轻器械+核心稳定工具",
    "chair_assist+light_dumbbell": "椅子辅助+轻哑铃",
    "machine_priority+low_impact_cardio": "固定器械+低冲击有氧",
    "bodyweight+short_session_timer": "徒手+短时训练计时",
    "hotel_room_bodyweight+resistance_band": "酒店徒手+弹力带",
    "running_only": "纯跑步",
    "running+hill_sprint+track_work": "跑步+坡冲+田径场训练",
    "rehab_band+chair_support": "康复弹力带+椅子支撑",
    "physio_machine+guided_rom_training": "康复器械+关节活动训练",
    "walking+bodyweight_low_impact": "步行+低冲击徒手",
    "machine+zone2_cardio": "器械+二区有氧",
}

main_body_profiles = [
    {"body_fat_band": "high", "target_body_fat_band": "mid", "bmi_band": "overweight", "bmr_band": "medium", "goal_direction": "fat_loss"},
    {"body_fat_band": "mid", "target_body_fat_band": "low", "bmi_band": "normal", "bmr_band": "medium", "goal_direction": "recomposition"},
    {"body_fat_band": "low", "target_body_fat_band": "low", "bmi_band": "normal", "bmr_band": "high", "goal_direction": "muscle_gain"},
    {"body_fat_band": "high", "target_body_fat_band": "mid", "bmi_band": "obese_class_1", "bmr_band": "high", "goal_direction": "fat_loss"},
    {"body_fat_band": "mid", "target_body_fat_band": "mid_low", "bmi_band": "normal_high", "bmr_band": "low", "goal_direction": "fat_loss"},
    {"body_fat_band": "mid_low", "target_body_fat_band": "low", "bmi_band": "normal", "bmr_band": "medium_high", "goal_direction": "recomposition"},
]
exercise_levels = ["novice", "intermediate", "advanced"]
medical_cycle = ["none", "old_injury", "none", "chronic_condition", "old_injury", "none"]
training_contexts = [
    {"location": "home", "equipment_profile": "bodyweight+mat"},
    {"location": "home", "equipment_profile": "dumbbell+resistance_band"},
    {"location": "gym", "equipment_profile": "barbell+machine+cardio_zone"},
    {"location": "gym", "equipment_profile": "machine_priority+guided_equipment"},
    {"location": "outdoor", "equipment_profile": "running+stairs+park_bar"},
    {"location": "home", "equipment_profile": "adjustable_dumbbell+bench"},
]
commitments = [
    {"weekly_total_minutes": 180, "session_minutes": 45, "frequency_per_week": 4, "time_window": "after_dinner_evening"},
    {"weekly_total_minutes": 150, "session_minutes": 30, "frequency_per_week": 5, "time_window": "early_morning_before_breakfast"},
    {"weekly_total_minutes": 240, "session_minutes": 60, "frequency_per_week": 4, "time_window": "before_dinner_evening"},
    {"weekly_total_minutes": 210, "session_minutes": 35, "frequency_per_week": 6, "time_window": "after_lunch_afternoon"},
    {"weekly_total_minutes": 160, "session_minutes": 40, "frequency_per_week": 4, "time_window": "before_lunch_midday"},
    {"weekly_total_minutes": 200, "session_minutes": 50, "frequency_per_week": 4, "time_window": "after_breakfast_morning"},
]
diets = ["balanced", "high_protein", "irregular", "restriction_based", "vegetarian", "high_protein"]
occupations = ["sedentary", "student", "physical_work", "shift_worker", "frequent_travel", "sedentary"]


def build_description(dim: dict) -> str:
    body = dim["body_assessment"]
    wc = dim["weekly_commitment"]
    equip = equipment_map.get(dim["training_context"]["equipment_profile"], dim["training_context"]["equipment_profile"])
    core = (
        f"该用户当前体脂{body_fat_map[body['body_fat_band']]}，目标体脂{body_fat_map[body['target_body_fat_band']]}，"
        f"BMI为{bmi_map[body['bmi_band']]}，BMR为{bmr_map[body['bmr_band']]}，方向是{goal_map[body['goal_direction']]}。"
        f"训练基础{exercise_map[dim['exercise_level']]}，健康状态{medical_map[dim['medical_history']]}。"
        f"常在{location_map[dim['training_context']['location']]}训练，器械为{equip}。"
        f"每周约{wc['weekly_total_minutes']}分钟，单次{wc['session_minutes']}分钟，频次{wc['frequency_per_week']}次，"
        f"时段以{time_map[wc['time_window']]}为主。"
        f"饮食{diet_map[dim['diet_habit']]}，职业{occupation_map[dim['occupation_type']]}。"
    )
    long_tail = "计划需兼顾安全边界、动作替代、恢复监测与执行稳定，并支持按周复盘调整。"
    short_tail = "计划需安全可执行、可恢复、可复盘，并能长期稳定坚持。"
    desc = core + long_tail
    if len(desc) > 200:
        desc = core + short_tail
    if len(desc) > 200:
        desc = desc.replace("每周约", "周约").replace("时段以", "时段").replace("并能", "且")
    if len(desc) < 150:
        desc += "同时保留训练日与休息日的节奏差异。"
    if len(desc) < 150:
        desc += "并设置打卡提醒闭环。"
    return desc


portraits: list[dict] = []

# 36 mainstream portraits
for i in range(36):
    body = main_body_profiles[i % len(main_body_profiles)]
    ex = exercise_levels[i % len(exercise_levels)]
    med = medical_cycle[i % len(medical_cycle)]
    tc = training_contexts[i % len(training_contexts)]
    wc = commitments[i % len(commitments)]
    diet = diets[i % len(diets)]
    occ = occupations[i % len(occupations)]

    dim = {
        "body_assessment": body,
        "exercise_level": ex,
        "medical_history": med,
        "training_context": tc,
        "weekly_commitment": wc,
        "diet_habit": diet,
        "occupation_type": occ,
    }

    pid = f"P{i + 1:03d}"
    desc = build_description(dim)
    short_tag = f"{exercise_map[ex]}|{location_map[tc['location']]}|{goal_map[body['goal_direction']]}|{occupation_map[occ]}"

    kfp = [
        f"为{pid}（{short_tag}）搜索3天参考三餐示例菜单模板：按{body['bmr_band']}BMR与{body['goal_direction']}目标分配热量和宏营养，输出早餐/午餐/晚餐+加餐可替换项。",
        f"为{pid}（{short_tag}）搜索外食与在家双场景三餐替换清单：结合{diet}饮食习惯和{occ}职业节奏，给出一周可循环食材与份量模板。",
        f"为{pid}（{short_tag}）搜索每日喝水目标计算模板：结合体重区间、训练日/休息日差异，生成ToDo清单与推送文案（早9/午12/晚18/睡前）。",
        f"为{pid}（{short_tag}）搜索喝水提醒失败补救策略：基于{wc['time_window']}时段习惯，生成漏喝后补水分配、避免夜间影响睡眠的推送规则。",
        f"为{pid}（{short_tag}）搜索4周健身框架模板：适配{tc['location']}与器械{tc['equipment_profile']}，并满足每周{wc['frequency_per_week']}次、每次{wc['session_minutes']}分钟。",
        f"为{pid}（{short_tag}）搜索每天ToDo动作列表模板：按{ex}训练水平与{med}医学约束，输出动作顺序、组数、时长、RPE和注意事项。",
    ]

    portraits.append(
        {
            "portrait_id": pid,
            "description": desc,
            "dimensions_snapshot": dim,
            "template_skeleton": {"knowledge_fill_points": kfp},
        }
    )

# 12 edge portraits
edge_dims = [
    {
        "body_assessment": {"body_fat_band": "mid_high", "target_body_fat_band": "mid", "bmi_band": "overweight", "bmr_band": "medium", "goal_direction": "fat_loss"},
        "exercise_level": "novice",
        "medical_history": "postpartum_recovery",
        "training_context": {"location": "home", "equipment_profile": "bodyweight+pelvic_floor_band"},
        "weekly_commitment": {"weekly_total_minutes": 120, "session_minutes": 30, "frequency_per_week": 4, "time_window": "after_lunch_afternoon"},
        "diet_habit": "balanced",
        "occupation_type": "sedentary",
    },
    {
        "body_assessment": {"body_fat_band": "mid", "target_body_fat_band": "mid_low", "bmi_band": "normal_high", "bmr_band": "medium_low", "goal_direction": "recomposition"},
        "exercise_level": "intermediate",
        "medical_history": "postpartum_recovery",
        "training_context": {"location": "gym", "equipment_profile": "light_machine+core_stability_tools"},
        "weekly_commitment": {"weekly_total_minutes": 150, "session_minutes": 50, "frequency_per_week": 3, "time_window": "after_breakfast_morning"},
        "diet_habit": "high_protein",
        "occupation_type": "sedentary",
    },
    {
        "body_assessment": {"body_fat_band": "mid", "target_body_fat_band": "mid", "bmi_band": "normal", "bmr_band": "low", "goal_direction": "recomposition"},
        "exercise_level": "novice",
        "medical_history": "age_50_plus",
        "training_context": {"location": "home", "equipment_profile": "chair_assist+light_dumbbell"},
        "weekly_commitment": {"weekly_total_minutes": 120, "session_minutes": 40, "frequency_per_week": 3, "time_window": "after_dinner_evening"},
        "diet_habit": "balanced",
        "occupation_type": "sedentary",
    },
    {
        "body_assessment": {"body_fat_band": "mid_high", "target_body_fat_band": "mid", "bmi_band": "overweight", "bmr_band": "medium_low", "goal_direction": "fat_loss"},
        "exercise_level": "intermediate",
        "medical_history": "age_50_plus",
        "training_context": {"location": "gym", "equipment_profile": "machine_priority+low_impact_cardio"},
        "weekly_commitment": {"weekly_total_minutes": 180, "session_minutes": 45, "frequency_per_week": 4, "time_window": "before_lunch_midday"},
        "diet_habit": "restriction_based",
        "occupation_type": "sedentary",
    },
    {
        "body_assessment": {"body_fat_band": "high", "target_body_fat_band": "mid", "bmi_band": "obese_class_1", "bmr_band": "high", "goal_direction": "fat_loss"},
        "exercise_level": "novice",
        "medical_history": "none",
        "training_context": {"location": "home", "equipment_profile": "bodyweight+short_session_timer"},
        "weekly_commitment": {"weekly_total_minutes": 90, "session_minutes": 15, "frequency_per_week": 6, "time_window": "flexible_fragmented"},
        "diet_habit": "irregular",
        "occupation_type": "sedentary",
    },
    {
        "body_assessment": {"body_fat_band": "mid", "target_body_fat_band": "mid_low", "bmi_band": "normal_high", "bmr_band": "medium", "goal_direction": "recomposition"},
        "exercise_level": "intermediate",
        "medical_history": "old_injury",
        "training_context": {"location": "home", "equipment_profile": "hotel_room_bodyweight+resistance_band"},
        "weekly_commitment": {"weekly_total_minutes": 110, "session_minutes": 22, "frequency_per_week": 5, "time_window": "flexible_fragmented"},
        "diet_habit": "high_protein",
        "occupation_type": "frequent_travel",
    },
    {
        "body_assessment": {"body_fat_band": "mid", "target_body_fat_band": "mid_low", "bmi_band": "normal", "bmr_band": "medium", "goal_direction": "fat_loss"},
        "exercise_level": "novice",
        "medical_history": "none",
        "training_context": {"location": "outdoor", "equipment_profile": "running_only"},
        "weekly_commitment": {"weekly_total_minutes": 150, "session_minutes": 30, "frequency_per_week": 5, "time_window": "early_morning_before_breakfast"},
        "diet_habit": "balanced",
        "occupation_type": "student",
    },
    {
        "body_assessment": {"body_fat_band": "mid_low", "target_body_fat_band": "low", "bmi_band": "normal", "bmr_band": "medium_high", "goal_direction": "recomposition"},
        "exercise_level": "advanced",
        "medical_history": "none",
        "training_context": {"location": "outdoor", "equipment_profile": "running+hill_sprint+track_work"},
        "weekly_commitment": {"weekly_total_minutes": 300, "session_minutes": 60, "frequency_per_week": 5, "time_window": "before_dinner_evening"},
        "diet_habit": "high_protein",
        "occupation_type": "physical_work",
    },
    {
        "body_assessment": {"body_fat_band": "high", "target_body_fat_band": "mid_high", "bmi_band": "obese_class_2", "bmr_band": "high", "goal_direction": "fat_loss"},
        "exercise_level": "novice",
        "medical_history": "severe_rehab",
        "training_context": {"location": "home", "equipment_profile": "rehab_band+chair_support"},
        "weekly_commitment": {"weekly_total_minutes": 100, "session_minutes": 20, "frequency_per_week": 5, "time_window": "after_breakfast_morning"},
        "diet_habit": "restriction_based",
        "occupation_type": "sedentary",
    },
    {
        "body_assessment": {"body_fat_band": "mid_high", "target_body_fat_band": "mid", "bmi_band": "overweight", "bmr_band": "medium", "goal_direction": "recomposition"},
        "exercise_level": "intermediate",
        "medical_history": "severe_rehab",
        "training_context": {"location": "gym", "equipment_profile": "physio_machine+guided_rom_training"},
        "weekly_commitment": {"weekly_total_minutes": 140, "session_minutes": 35, "frequency_per_week": 4, "time_window": "after_lunch_afternoon"},
        "diet_habit": "balanced",
        "occupation_type": "sedentary",
    },
    {
        "body_assessment": {"body_fat_band": "high", "target_body_fat_band": "mid", "bmi_band": "obese_class_1", "bmr_band": "medium_high", "goal_direction": "fat_loss"},
        "exercise_level": "novice",
        "medical_history": "chronic_condition",
        "training_context": {"location": "home", "equipment_profile": "walking+bodyweight_low_impact"},
        "weekly_commitment": {"weekly_total_minutes": 140, "session_minutes": 35, "frequency_per_week": 4, "time_window": "before_dinner_evening"},
        "diet_habit": "restriction_based",
        "occupation_type": "shift_worker",
    },
    {
        "body_assessment": {"body_fat_band": "mid", "target_body_fat_band": "mid_low", "bmi_band": "normal_high", "bmr_band": "medium", "goal_direction": "recomposition"},
        "exercise_level": "intermediate",
        "medical_history": "chronic_condition",
        "training_context": {"location": "gym", "equipment_profile": "machine+zone2_cardio"},
        "weekly_commitment": {"weekly_total_minutes": 180, "session_minutes": 45, "frequency_per_week": 4, "time_window": "after_dinner_evening"},
        "diet_habit": "balanced",
        "occupation_type": "sedentary",
    },
]

for idx, dim in enumerate(edge_dims, start=37):
    pid = f"P{idx:03d}"
    desc = build_description(dim)
    body = dim["body_assessment"]
    short_tag = (
        f"{exercise_map[dim['exercise_level']]}|"
        f"{location_map[dim['training_context']['location']]}|"
        f"{goal_map[body['goal_direction']]}|"
        f"{occupation_map[dim['occupation_type']]}"
    )
    kfp = [
        f"为{pid}（{short_tag}）搜索3天参考三餐示例菜单模板：以{medical_map[dim['medical_history']]}为约束，匹配{body['bmr_band']}BMR和{body['goal_direction']}目标热量。",
        f"为{pid}（{short_tag}）搜索高可执行三餐替换方案：结合{diet_map[dim['diet_habit']]}与{occupation_map[dim['occupation_type']]}作息，输出工作日/周末双模板。",
        f"为{pid}（{short_tag}）搜索每日喝水目标与提醒模板：按训练日和非训练日分层，生成ToDo清单与四时点推送文案（早9/午12/晚18/睡前）。",
        f"为{pid}（{short_tag}）搜索喝水提醒个性化规则：根据{time_map[dim['weekly_commitment']['time_window']]}时段、睡眠影响和慢病/恢复注意点配置提醒频率。",
        f"为{pid}（{short_tag}）搜索4周训练框架模板：适配{dim['training_context']['location']}与器械{dim['training_context']['equipment_profile']}，满足每周{dim['weekly_commitment']['frequency_per_week']}次节奏。",
        f"为{pid}（{short_tag}）搜索每天ToDo动作模板：针对{medical_map[dim['medical_history']]}与{exercise_map[dim['exercise_level']]}，输出动作、组数、时长、强度上限和风险提示。",
    ]
    portraits.append(
        {
            "portrait_id": pid,
            "description": desc,
            "dimensions_snapshot": dim,
            "template_skeleton": {"knowledge_fill_points": kfp},
        }
    )

# strict validation
assert len(portraits) == 48
assert [p["portrait_id"] for p in portraits] == [f"P{i:03d}" for i in range(1, 49)]
for p in portraits:
    ds = p["dimensions_snapshot"]
    assert all(
        k in ds
        for k in [
            "body_assessment",
            "exercise_level",
            "medical_history",
            "training_context",
            "weekly_commitment",
            "diet_habit",
            "occupation_type",
        ]
    )
    assert len(p["template_skeleton"]["knowledge_fill_points"]) == 6
    length = len(p["description"])
    if not (150 <= length <= 200):
        raise ValueError(f"Description length out of range for {p['portrait_id']}: {length}")

summary = "共生成48个分层典型用户画像通用模板骨架，专为下游Agent搜索知识库设计，RAG匹配逻辑：精确维度→相似度"
xml_content = "\n".join(
    [
        "<user_portraits_kb>",
        f"<summary>{summary}</summary>",
        "<portraits>",
        json.dumps(portraits, ensure_ascii=False, indent=2),
        "</portraits>",
        "<db_schema_suggestion>SQL CREATE TABLE portraits (portrait_id TEXT PRIMARY KEY, description TEXT, dimensions_snapshot JSONB, template_skeleton JSONB);</db_schema_suggestion>",
        "<rag_retrieval_tip>下游Agent搜索建议：用portrait_id或dimensions_snapshot做精确匹配，再用knowledge_fill_points做RAG查询</rag_retrieval_tip>",
        "</user_portraits_kb>",
    ]
)
OUT_PATH.write_text(xml_content, encoding="utf-8")

lens = [len(p["description"]) for p in portraits]
edge_counts = {
    "postpartum_recovery": sum(1 for p in portraits if p["dimensions_snapshot"]["medical_history"] == "postpartum_recovery"),
    "age_50_plus": sum(1 for p in portraits if p["dimensions_snapshot"]["medical_history"] == "age_50_plus"),
    "severe_rehab": sum(1 for p in portraits if p["dimensions_snapshot"]["medical_history"] == "severe_rehab"),
    "chronic_condition": sum(1 for p in portraits if p["dimensions_snapshot"]["medical_history"] == "chronic_condition"),
    "outdoor_location": sum(1 for p in portraits if p["dimensions_snapshot"]["training_context"]["location"] == "outdoor"),
    "frequent_travel": sum(1 for p in portraits if p["dimensions_snapshot"]["occupation_type"] == "frequent_travel"),
}

print(f"WROTE={OUT_PATH}")
print(f"COUNT={len(portraits)}")
print(f"DESC_MIN={min(lens)} DESC_MAX={max(lens)}")
print("EDGE_COUNTS=" + json.dumps(edge_counts, ensure_ascii=False))
