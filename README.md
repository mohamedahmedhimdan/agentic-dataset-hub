# Agentic AI Dataset Hub

دليل تعليمي عربي ومكتبة مصادر. جميع حالات أهلية البيانات إرشادية وتحتاج مراجعة الحقوق والمصادر الأصلية.

## تشغيل
```bash
npm install
npm run dev
npm test
npm run build
```

## Cloudflare Pages
النشر يتم إلى مشروع Pages الحالي `agentic-dataset-hub` عبر GitHub Actions. لا تنشئ مشروعًا جديدًا ولا تغيّر العنوان أو DNS. الفرع الإنتاجي هو `main`، وأمر البناء `npm run build`، ومجلد المخرجات `dist`.

العنوان الحالي يبقى:

https://agentic-dataset-hub.pages.dev

بعد دمج طلب السحب في `main` يشغّل `.github/workflows/deploy.yml` هذه الخطوات بالترتيب: `npm ci`، ثم `npm test`، ثم `npm run build`، ثم:

```bash
wrangler pages deploy dist --project-name=agentic-dataset-hub --branch=main
```

يستخدم سير العمل سرّي GitHub الموجودين `CLOUDFLARE_API_TOKEN` و`CLOUDFLARE_ACCOUNT_ID`. لا يُمرَّر أي سر إلى طلبات السحب. ملف `.github/workflows/ci.yml` يشغّل الاختبار والبناء فقط على طلبات السحب.

يمكن تشغيل النشر يدويًا من تبويب Actions باختيار الفرع `main` ثم Run workflow. اختيار فرع آخر يتوقف ولا ينشر.

لا يتطلب الموقع قاعدة بيانات. المفضلة والتقدم في localStorage. المسارات تعتمد على `public/_redirects`.

### التعديل من الهاتف
1. افتح Cursor Cloud Agents واطلب التعديل أو الميزة.
2. ينفّذ الوكيل التغيير على فرع مستقل ويشغّل `npm ci` و`npm test` و`npm run build`.
3. راجع طلب السحب. فحص CI يظهر نتيجة الاختبار والبناء. هذا الإعداد لا ينشئ معاينة Cloudflare لطلب السحب، لأن ذلك سيمرّر أسرار النشر إلى كود غير مدمج.
4. ادمج الطلب في `main` عندما توافق. الدمج هو ما يبدأ النشر إلى المشروع الحالي.
5. افتح تبويب Actions وتأكد أن سير Deploy to Cloudflare Pages نجح، ثم افتح العنوان الحالي.

لم يُتحقق هنا من عنوان معاينة مستضاف. بعد الدمج يُحدَّث الموقع الحالي فقط إذا نجح سير العمل.

روابط المصادر مقدمة في ملف الطلب؛ لم يتم التحقق من صلاحيتها أو تراخيصها وقت الإنشاء. لا تستخدم بيانات اختبارات محمية للتدريب دون مراجعة.
