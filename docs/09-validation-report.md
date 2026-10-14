# گزارش اعتبارسنجی نسخهٔ ۰.۲ — ۲۰۲۶-۱۰-۱۴

- اعتبارسنجی: **PASS** — PASS: 12 workflow specifications, 5 recipes, dependencies, approval gates and companion Markdown files
- آزمون واحد: **۸ آزمون موفق** (Python 3.13.5).
- دستور سازنده Manifest برای مسیر آماده `systematic-review`: **PASS**، بدون اجرای واقعی Chat/Work.
- دروازه انسانی: مسدودسازی پذیرش بدون تأییدِ دقیق همان مرحله: **PASS**.
- وابستگی: شناسایی حلقه و مسدودسازی مرحلهٔ فاقد ورودی پذیرفته‌شده: **PASS**.
- محاسبه محلی مصنوعی: **PASS**؛ n=5، میانگین تفاوت=0.6؛ **نتیجه علمی تجربی نیست.**
- نمونه منبعی واقعی: ثبت شش ادعای نامزد و حدود آنها از بخش‌های مرتبطِ مقاله Wilkinson et al. (2016) در وب ناشر؛ این نمونه توسط داور مستقل بررسی نشده است.
- محدوده: کنترل ساختاری، یک نمونه فیش‌برداری، نمونه اجرای محلی. **هیچ اجرای واقعی Work/چندChat و هیچ آزمون مقایسه‌ای اثربخشی عامل‌محور انجام نشده است.**
- انتشار در GitHub: **NOT PUBLISHED**.

## خروجی خام آزمون

```text
PASS: 12 workflow specifications, 5 recipes, dependencies, approval gates and companion Markdown files
test_all_twelve (test_toolkit.ToolkitTests.test_all_twelve) ... ok
test_fail_closed_on_cycle (test_toolkit.ToolkitTests.test_fail_closed_on_cycle) ... ok
test_five_recipes (test_toolkit.ToolkitTests.test_five_recipes) ... ok
test_gate_requires_approval (test_toolkit.ToolkitTests.test_gate_requires_approval) ... ok
test_human_gate_not_silently_disabled (test_toolkit.ToolkitTests.test_human_gate_not_silently_disabled) ... ok
test_manifest_generator_doesnt_overwrite (test_toolkit.ToolkitTests.test_manifest_generator_doesnt_overwrite) ... ok
test_recipe_manifest_namespaces (test_toolkit.ToolkitTests.test_recipe_manifest_namespaces) ... ok
test_synthetic_demo (test_toolkit.ToolkitTests.test_synthetic_demo) ... ok

----------------------------------------------------------------------
Ran 8 tests in 0.004s

OK
```
