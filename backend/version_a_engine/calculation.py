import math

# قدرة المكيفات بالواط حسب السعة (طن) — من قسم 8 بالمتطلبات
# ⚠️ غير موجودة كجدول Reference بالمتطلبات (بعكس Appliance)، لذلك ثابتة هنا بالكود
AC_POWER_WATTS = {
    1: 1100,
    1.5: 1600,
    2: 2200,
}

# الثوابت المستخدمة بمعادلات قسم 7 — حرفيًا كما وردت
BATTERY_EFFICIENCY = 0.8       # سعة البطاريات = استهلاك الليل ÷ 1000 ÷ 0.8
INVERTER_SAFETY_FACTOR = 1.25  # قدرة العاكس = حمل الذروة × 1.25
SUN_HOURS = 5                   # عدد الألواح = ... ÷ (5 × 0.75)
DUST_HEAT_FACTOR = 0.75         # معامل حرارة بغداد والغبار
PANEL_WATTAGE = 550              # قدرة اللوح الواحد بالواط

# أسعار تقديرية للمكوّنات — مشتقة من بيانات Product الموجودة بـ seed.py
# (غير موجودة رسميًا بالمتطلبات، هذا تقدير هندسي مبني على أسعار السوق التقريبية)
PRICE_PER_PANEL = 180          # لوح 550W واحد
PRICE_PER_KW_INVERTER = 130    # لكل كيلوواط من قدرة العاكس
PRICE_PER_KWH_BATTERY = 260    # لكل كيلوواط ساعة تخزين
PRICE_RANGE_MARGIN = 0.15      # هامش ± للتقلبات السوقية (تركيب، شحن، فروقات موردين)


def get_ac_power_watts(capacity_ton: float) -> float:
    if capacity_ton not in AC_POWER_WATTS:
        raise ValueError(f"سعة مكيف غير معروفة بالمتطلبات: {capacity_ton} طن")
    return AC_POWER_WATTS[capacity_ton]


# فئات الأجهزة اللي تشتغل باستمرار (24 ساعة)، فتُحسب أيضًا ضمن الاستهلاك النهاري
# ⚠️ غير موجود صراحة بالمتطلبات — استنتاج من الطبيعة الفيزيائية لهذي الفئة (لا تنطفي)
# ومن حقل category الموجود فعليًا بجدول Appliance (قسم 4)
CONTINUOUS_CATEGORIES = {"تبريد"}


def calculate_assessment(
    appliances_input: list,
    acs_input: list,
    national_electricity_hours: int,
    night_hours: int,
    appliance_power_lookup: dict,
    appliance_category_lookup: dict,
) -> dict:
    """
    ينفّذ معادلات قسم 7 بالمتطلبات على مدخلات الحاسبة (الأجهزة والمكيفات المختارة)
    ويرجع كل النتائج المطلوبة لتعبئة سجل Assessment.

    appliances_input: قائمة dict لكل جهاز {appliance_id, quantity, hours_at_night}
    acs_input: قائمة dict لكل مكيف {capacity_ton, ac_type, quantity, hours_at_night}
    appliance_power_lookup: dict يربط appliance_id بقدرته بالواط (يُجلب من جدول Appliance)
    appliance_category_lookup: dict يربط appliance_id بفئته (يُجلب من جدول Appliance)
    """
    night_consumption = 0.0
    peak_load = 0.0
    normal_ac_count = 0
    day_consumption = 0.0

    day_hours = max(national_electricity_hours - night_hours, 0)

    for item in appliances_input:
        power = appliance_power_lookup[item["appliance_id"]]
        qty = item["quantity"]
        hours = item["hours_at_night"]

        night_consumption += power * qty * hours
        peak_load += power * qty

        # فقط الأجهزة المستمرة (تبريد) تُحتسب أيضًا بالنهار — باقي الأجهزة
        # (تلفزيون، غسالة، إضاءة...) استخدامها بالنهار غير مضمون فما تُحسب
        category = appliance_category_lookup[item["appliance_id"]]
        if category in CONTINUOUS_CATEGORIES:
            day_consumption += power * qty * day_hours

    for ac in acs_input:
        power = get_ac_power_watts(ac["capacity_ton"])
        qty = ac["quantity"]
        hours = ac["hours_at_night"]

        night_consumption += power * qty * hours
        peak_load += power * qty

        if ac["ac_type"] == "عادي":
            normal_ac_count += qty

    ac_warning = None
    if normal_ac_count >= 2:
        ac_warning = (
            "تنبيه: اختيار مكيفين عاديين أو أكثر يزيد الحمل بشكل كبير — "
            "يُفضل استخدام مكيف Inverter لتقليل الاستهلاك."
        )

    battery_capacity = (night_consumption / 1000) / BATTERY_EFFICIENCY
    inverter_size = peak_load * INVERTER_SAFETY_FACTOR
    daily_consumption = night_consumption + day_consumption

    panel_count = math.ceil(
        daily_consumption / (SUN_HOURS * DUST_HEAT_FACTOR) / PANEL_WATTAGE
    )

    # السعر التقديري: مبني على المكوّنات الفعلية المحسوبة (ألواح، عاكس، بطاريات)
    # وليس على مدخلات العميل (الميزانية) — هذا تقدير هندسي، غير موجود بالمعادلات الأصلية.
    base_price = (
        panel_count * PRICE_PER_PANEL
        + (inverter_size / 1000) * PRICE_PER_KW_INVERTER
        + battery_capacity * PRICE_PER_KWH_BATTERY
    )
    estimated_min_price = round(base_price * (1 - PRICE_RANGE_MARGIN), 2)
    estimated_max_price = round(base_price * (1 + PRICE_RANGE_MARGIN), 2)

    return {
        "night_consumption": night_consumption,
        "peak_load": peak_load,
        "battery_capacity": battery_capacity,
        "inverter_size": inverter_size,
        "daily_consumption": daily_consumption,
        "panel_count": panel_count,
        "estimated_min_price": estimated_min_price,
        "estimated_max_price": estimated_max_price,
        "ac_warning": ac_warning,
    }