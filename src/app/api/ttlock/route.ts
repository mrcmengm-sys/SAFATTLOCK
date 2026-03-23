
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

async function getAccessToken(body: any) {
  const { username, password } = body;
  const clientId = process.env.NEXT_PUBLIC_TTLOCK_CLIENT_ID;
  const clientSecret = process.env.NEXT_PUBLIC_TTLOCK_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { errormsg: "بيانات تطبيق TTLock (Client ID/Secret) غير معرفة في الخادم." },
      { status: 500 }
    );
  }

  if (!username || !password) {
    return NextResponse.json(
      { errormsg: "اسم المستخدم أو كلمة المرور مفقودة." },
      { status: 400 }
    );
  }

  const md5Password = crypto.createHash("md5").update(password).digest("hex");

  const response = await fetch("https://euapi.ttlock.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      clientId,
      clientSecret,
      username,
      password: md5Password,
      date: Date.now().toString(), // إضافة التاريخ هنا أيضاً للأمان
    }),
  });

  const data = await response.json();

  if (response.ok && data.access_token) {
    return NextResponse.json(data);
  } else {
    const serverTime = new Date().toLocaleString('ar-EG');
    return NextResponse.json(
      { errormsg: (data.errmsg || data.description || "An unknown error occurred.") + " (وقت الخادم: " + serverTime + ")", errcode: data.errcode },
      { status: response.status === 200 ? 400 : response.status }
    );
  }
}

async function getLocks(body: any) {
  const { accessToken } = body;

  if (!accessToken) {
    return NextResponse.json(
      { error: "Missing access token." },
      { status: 400 }
    );
  }

  const response = await fetch(`https://euapi.ttlock.com/v3/lock/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      clientId: process.env.NEXT_PUBLIC_TTLOCK_CLIENT_ID!,
      accessToken,
      pageNo: "1",
      pageSize: "100",
      date: Date.now().toString(),
    }),
  });

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    console.log("TTLock Full Lock Object (First Lock):", data.list?.[0]); // طباعة أول قفل بكامل تفاصيله لنعرف الحقول المتاحة

    if (response.ok && (!data.errcode || data.errcode === 0)) {
      return NextResponse.json(data);
    } else {
      const serverTime = new Date().toLocaleString('ar-EG');
      const errorMsg = data.errmsg || data.description || "فشل في جلب الأقفال من TTLock.";
      return NextResponse.json(
        { errormsg: `${errorMsg} (وقت الخادم الآن: ${serverTime})`, errcode: data.errcode },
        { status: response.status === 200 ? 400 : response.status }
      );
    }
  } catch (e) {
    console.error("Failed to parse JSON from getLocks, received non-JSON response:", text);
    return NextResponse.json({ errormsg: "خادم TTLock أرسل رداً غير متوقع (قد يكون صفحة خطأ)." }, { status: 500 });
  }
}

async function getRecords(body: any) {
  const { accessToken, lockId } = body;

  if (!accessToken || !lockId) {
    return NextResponse.json(
      { error: "Missing access token or lockId." },
      { status: 400 }
    );
  }

  const response = await fetch(`https://euapi.ttlock.com/v3/lockRecord/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      clientId: process.env.NEXT_PUBLIC_TTLOCK_CLIENT_ID!,
      accessToken,
      lockId: lockId.toString(),
      pageNo: "1",
      pageSize: "100",
      date: Date.now().toString(),
    }),
  });

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    console.log("TTLock Response (Records):", data);

    if (response.ok && (!data.errcode || data.errcode === 0)) {
      return NextResponse.json(data);
    } else {
      const serverTime = new Date().toLocaleString('ar-EG');
      const errorMsg = data.errmsg || data.description || "فشل في جلب السجلات من TTLock.";
      return NextResponse.json(
        { errormsg: `${errorMsg} (وقت الخادم الآن: ${serverTime})`, errcode: data.errcode },
        { status: response.status === 200 ? 400 : response.status }
      );
    }
  } catch (e) {
    console.error("Failed to parse JSON from getRecords, received non-JSON response:", text);
    return NextResponse.json({ errormsg: "خادم TTLock أرسل رداً غير متوقع (قد يكون صفحة خطأ)." }, { status: 500 });
  }
}

async function listPasscodes(body: any) {
  const { accessToken, lockId } = body;

  if (!accessToken || !lockId) {
    return NextResponse.json(
      { error: "Missing access token or lockId." },
      { status: 400 }
    );
  }

  const response = await fetch(`https://euapi.ttlock.com/v3/lock/listKeyboardPwd`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      clientId: process.env.NEXT_PUBLIC_TTLOCK_CLIENT_ID!,
      accessToken,
      lockId: lockId.toString(),
      pageNo: "1",
      pageSize: "100",
      date: Date.now().toString(),
    }),
  });
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    console.log("TTLock Response (Passcodes):", data);
    if (response.ok && (!data.errcode || data.errcode === 0)) {
      return NextResponse.json(data);
    } else {
      const serverTime = new Date().toLocaleString('ar-EG');
      const errorMsg = data.errmsg || data.description || "فشل في عرض رموز المرور.";
      return NextResponse.json(
        { errormsg: `${errorMsg} (وقت الخادم: ${serverTime})`, errcode: data.errcode },
        { status: response.status === 200 ? 400 : response.status }
      );
    }
  } catch (e) {
    console.error("Failed to parse JSON, received HTML instead:", text);
    return NextResponse.json({ errormsg: "خادم TTLock أرسل رداً غير متوقع (قد يكون صفحة خطأ)." }, { status: 500 });
  }
}

async function addPasscode(body: any) {
  const { accessToken, lockId, keyboardPwd, keyboardPwdName, startDate, endDate } = body;
  const response = await fetch(`https://euapi.ttlock.com/v3/keyboardPwd/add`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      clientId: process.env.NEXT_PUBLIC_TTLOCK_CLIENT_ID!,
      accessToken,
      lockId: lockId.toString(),
      keyboardPwd: keyboardPwd.toString(),
      keyboardPwdName: (keyboardPwdName || "").toString(),
      startDate: startDate.toString(),
      endDate: endDate.toString(),
      addType: "2", // Adding via gateway
      date: Date.now().toString(),
    }),
  });
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    console.log("TTLock Response (Add Passcode):", data);
    if (response.ok && (!data.errcode || data.errcode === 0)) {
      return NextResponse.json(data);
    } else {
      const serverTime = new Date().toLocaleString('ar-EG');
      const errorMsg = data.errmsg || data.description || "فشل في إضافة رمز المرور.";
      return NextResponse.json(
        { errormsg: `${errorMsg} (وقت الخادم: ${serverTime})`, errcode: data.errcode },
        { status: response.status === 200 ? 400 : response.status }
      );
    }
  } catch (e) {
    console.error("Failed to parse JSON from addPasscode, received non-JSON response:", text);
    return NextResponse.json({ errormsg: "خادم TTLock أرسل رداً غير متوقع (قد يكون صفحة خطأ)." }, { status: 500 });
  }
}

async function unlockLock(body: any) {
  const { accessToken, lockId } = body;

  if (!accessToken || !lockId) {
    return NextResponse.json(
      { error: "Missing access token or lockId." },
      { status: 400 }
    );
  }

  const response = await fetch(`https://euapi.ttlock.com/v3/lock/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      clientId: process.env.NEXT_PUBLIC_TTLOCK_CLIENT_ID!,
      accessToken,
      lockId: lockId.toString(),
      date: Date.now().toString(),
    }),
  });

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    if (response.ok && (!data.errcode || data.errcode === 0)) {
      return NextResponse.json(data);
    } else {
      const serverTime = new Date().toLocaleString('ar-EG');
      const errorMsg = data.errmsg || data.description || "فشل في فتح القفل.";
      return NextResponse.json(
        { errormsg: `${errorMsg} (ملاحظة: تأكد من تفعيل 'Remote Unlock' في إعدادات القفل)، وقت الخادم: ${serverTime}`, errcode: data.errcode },
        { status: response.status === 200 ? 400 : response.status }
      );
    }
  } catch (e) {
    return NextResponse.json({ errormsg: "خادم TTLock أرسل رداً غير متوقع." }, { status: 500 });
  }
}

async function getLockDetail(body: any) {
  const { accessToken, lockId } = body;

  if (!accessToken || !lockId) {
    return NextResponse.json(
      { error: "Missing access token or lockId." },
      { status: 400 }
    );
  }

  const response = await fetch(`https://euapi.ttlock.com/v3/lock/detail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      clientId: process.env.NEXT_PUBLIC_TTLOCK_CLIENT_ID!,
      accessToken,
      lockId: lockId.toString(),
      date: Date.now().toString(),
    }),
  });

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    if (response.ok && (!data.errcode || data.errcode === 0)) {
      return NextResponse.json(data);
    } else {
      const errorMsg = data.errmsg || data.description || "فشل في جلب تفاصيل القفل.";
      return NextResponse.json(
        { errormsg: errorMsg, errcode: data.errcode },
        { status: 400 }
      );
    }
  } catch (e) {
    return NextResponse.json({ errormsg: "خادم TTLock أرسل رداً غير متوقع." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === 'get_token') {
      return await getAccessToken(body);
    } else if (type === 'get_locks') {
      return await getLocks(body);
    } else if (type === 'get_lock_detail') {
      return await getLockDetail(body);
    } else if (type === 'get_records') {
      return await getRecords(body);
    } else if (type === 'list_passcodes') {
      return await listPasscodes(body);
    } else if (type === 'add_passcode') {
      return await addPasscode(body);
    } else if (type === 'unlock') {
      return await unlockLock(body);
    } else {
      return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
    }

  } catch (err) {
    console.error("INTERNAL SERVER ERROR DETAILS:", err);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
