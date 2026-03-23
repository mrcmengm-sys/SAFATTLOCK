
"use client";

import { useState, useEffect } from "react";
import CryptoJS from "crypto-js";

export default function TTLockTestPage() {
  const [username, setUsername] = useState("msc22@outlook.sa");
  const [password, setPassword] = useState("Masaken445566");
  const [accessToken, setAccessToken] = useState("");
  const [locks, setLocks] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [passcodes, setPasscodes] = useState<any[]>([]);
  const [selectedLock, setSelectedLock] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // حالة موحدة للأخطاء والتحميل
  const [loading, setLoading] = useState<string | null>(null); // e.g., 'login', 'locks', 'records_123'
  const [error, setError] = useState<string | null>(null);

  // التحقق من HTTPS للبلوتوث
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setError("تنبيه: تقنية البلوتوث تتطلب اتصالاً آمناً (HTTPS). قد لا تعمل بعض الأزرار بشكل صحيح.");
    }
  }, []);

  // حفظ واستعادة رمز الوصول ومحاولة الدخول التلقائي
  useEffect(() => {
    const savedToken = localStorage.getItem("ttlock_access_token");
    if (savedToken) {
      setAccessToken(savedToken);
      // جلب الأقفال مباشرة إذا كان الرمز موجوداً
      getLocksWithToken(savedToken);
    } else {
      // إذا لم يوجد رمز مخزن، نقوم بتسجيل الدخول تلقائياً بالبيانات الافتراضية
      autoLogin();
    }
  }, []);

  const autoLogin = async () => {
    setLoading('login');
    setError(null);
    try {
      const response = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "get_token", username: "msc22@outlook.sa", password: "Masaken445566" }),
      });
      const data = await response.json();
      if (response.ok && data.access_token) {
        setAccessToken(data.access_token);
        getLocksWithToken(data.access_token);
      }
    } catch (err) {
      console.error("Auto login failed", err);
    } finally {
      setLoading(null);
    }
  };

  const getLocksWithToken = async (token: string) => {
    setLoading('locks');
    setError(null);
    try {
      const response = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'get_locks', accessToken: token }),
      });
      const data = await response.json();
      if (response.ok && data.list) {
        setLocks(data.list);
      }
    } catch (err) {
      console.error("Initial locks fetch failed", err);
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem("ttlock_access_token", accessToken);
    } else {
      localStorage.removeItem("ttlock_access_token");
    }
  }, [accessToken]);

  const getAccessToken = async () => {
    setLoading('login');
    setError(null);
    try {
      const response = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "get_token", username, password }),
      });
      const data = await response.json();
      if (response.ok && data.access_token) {
        setAccessToken(data.access_token);
      } else {
        setError(data.errormsg || "فشل تسجيل الدخول.");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(null);
    }
  };

  const logout = () => {
    setAccessToken("");
    setLocks([]);
    setRecords([]);
    setPasscodes([]);
    setError(null);
    localStorage.removeItem("ttlock_access_token");
  };

  const getLocks = async () => {
    setLoading('locks');
    setError(null);
    setRecords([]); // إخفاء السجلات عند تحديث الأقفال
    try {
      const response = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'get_locks', accessToken }),
      });
      const data = await response.json();
      if (response.ok && data.list) {
        setLocks(data.list);
      } else {
        setError(data.errormsg || "فشل في جلب الأقفال.");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(null);
    }
  };

  const getRecords = async (lockId: number) => {
    setLoading(`records_${lockId}`);
    setError(null);
    setRecords([]);
    try {
      const response = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'get_records', accessToken, lockId }),
      });
      const data = await response.json();
      if (response.ok && data.list) {
        setRecords(data.list);
      } else {
        const detailedError = data.errormsg || `خطأ من الخادم: ${JSON.stringify(data)}`;
        setError(detailedError);
      }
    } catch (err) {
      setError("فشل الاتصال بالخادم.");
    } finally {
      setLoading(null);
    }
  };

  const listPasscodes = async (lock: any) => {
    setSelectedLock(lock);
    setIsModalOpen(true);
    setLoading(`passcodes_${lock.lockId}`);
    setError(null);
    setPasscodes([]);
    try {
      const response = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'list_passcodes', accessToken, lockId: lock.lockId }),
      });
      const data = await response.json();
      if (response.ok && data.list) {
        setPasscodes(data.list);
      } else {
        const detailedError = data.errormsg || `خطأ من الخادم: ${JSON.stringify(data)}`;
        setError(detailedError);
      }
    } catch (err) {
      setError("فشل الاتصال بالخادم.");
    } finally {
      setLoading(null);
    }
  };

  const addPasscode = async (passcode: string, passcodeName: string) => {
    if (!selectedLock) return;
    setLoading('add_passcode');
    setError(null);
    try {
      const response = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 'add_passcode',
          accessToken,
          lockId: selectedLock.lockId,
          keyboardPwd: passcode,
          keyboardPwdName: passcodeName,
          startDate: 0, // 0 for permanent
          endDate: 0,   // 0 for permanent
        }),
      });
      const data = await response.json();
      if (response.ok && data.keyboardPwdId) {
        listPasscodes(selectedLock); // Refresh list
        // Clear inputs
        const nameInput = document.getElementById('passcodeName') as HTMLInputElement;
        const codeInput = document.getElementById('passcode') as HTMLInputElement;
        if (nameInput) nameInput.value = '';
        if (codeInput) codeInput.value = '';
      } else {
        alert(`خطأ: ${data.errormsg || "فشل في إضافة الرمز."}`);
      }
    } catch (err) {
      alert("خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(null);
    }
  };

  const unlockLock = async (lockId: number) => {
    setLoading(`unlock_${lockId}`);
    setError(null);
    try {
      const response = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'unlock', accessToken, lockId }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("تم فتح القفل بنجاح عبر الإنترنت!");
      } else {
        setError(data.errormsg || "فشل فتح القفل.");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالخادم.");
    } finally {
      setLoading(null);
    }
  };

  const unlockViaBluetooth = async (lock: any) => {
    setError(null);
    
    // التحقق من دعم المتصفح للبلوتوث
    const bluetooth = (navigator as any).bluetooth;
    if (!bluetooth) {
      alert("متصفحك لا يدعم تقنية Web Bluetooth. يرجى استخدام Chrome أو Edge على Android، أو متصفح WebBLE على iOS.");
      return;
    }

    try {
      // هام جداً للجوال: يجب طلب الجهاز مباشرة بعد النقر للحفاظ على "بادرة المستخدم" (User Gesture)
      console.log("Requesting Bluetooth device...");
      const device = await bluetooth.requestDevice({
        filters: [{ services: ['00001910-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['00001910-0000-1000-8000-00805f9b34fb']
      });

      // جلب مفاتيح التشفير أثناء/بعد اختيار الجهاز
      console.log("Fetching lock detail for Bluetooth keys...");
      const detailResponse = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'get_lock_detail', accessToken, lockId: lock.lockId }),
      });
      const lockDetail = await detailResponse.json();

      if (!detailResponse.ok) {
        throw new Error(lockDetail.errormsg || "فشل في جلب مفاتيح التشفير من السحابة.");
      }

      const { aesKeyStr } = lockDetail;
      console.log("AES Key retrieved:", aesKeyStr);

      console.log("Connecting to GATT Server...");
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('00001910-0000-1000-8000-00805f9b34fb');
      
      // خاصية الكتابة (Write) وخاصية الإشعارات (Notify) لـ TTLock
      const charWrite = await service?.getCharacteristic('00001911-0000-1000-8000-00805f9b34fb');
      const charNotify = await service?.getCharacteristic('00001912-0000-1000-8000-00805f9b34fb');

      await charNotify?.startNotifications();
      charNotify?.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        console.log("Received notification from lock:", value);
      });

      // دالة لتشفير وإرسال البيانات
      const sendEncryptedCommand = async (commandHex: string) => {
        const key = CryptoJS.enc.Hex.parse(aesKeyStr);
        const data = CryptoJS.enc.Hex.parse(commandHex);
        const encrypted = CryptoJS.AES.encrypt(data, key, {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.NoPadding
        });
        
        // تحويل CryptoJS ciphertext إلى Uint8Array بدون استخدام Buffer
        const ciphertextHex = encrypted.ciphertext.toString();
        const bytes = new Uint8Array(ciphertextHex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(ciphertextHex.substring(i * 2, i * 2 + 2), 16);
        }
        await charWrite?.writeValue(bytes);
      };

      // مثال لأمر الفتح (Unlock Payload - يختلف حسب إصدار البروتوكول)
      // ملاحظة: هذا مجرد هيكل توضيحي، الأوامر الفعلية تتطلب بناء باكت محدد (Header + Command + Checksum)
      alert("تم الاتصال بنجاح واستخراج مفتاح التشفير. جاري محاولة إرسال أمر الفتح المشفر...");
      
      // بروتوكول TTLock V3 يتطلب بناء Packet معقد
      // سنقوم هنا بمحاكاة إرسال أول باكت للمصادقة
      console.log("Attempting to send encrypted authentication packet...");
      
      alert("تنبيه: تم إعداد بيئة التشفير AES-128. لفتح القفل فعلياً، يجب بناء الـ Packet البرمجي الخاص بـ TTLock (Protocol V3) بدقة.");

    } catch (err: any) {
      console.error("Bluetooth Error:", err);
      if (err.name === 'NotFoundError') {
        // المستخدم ألغى البحث أو لم يجد جهازاً
      } else {
        setError(`خطأ في البلوتوث: ${err.message}`);
      }
    }
  };

  const formatRecordType = (type: number) => {
    const types: { [key: number]: string } = {
      1: "فتح عبر التطبيق",
      4: "فتح عبر رمز مرور",
      7: "فتح عبر بطاقة IC",
      8: "فتح عبر بصمة الإصبع",
      10: "فتح عبر سوار",
      11: "فتح يدوي (من الداخل)",
      12: "قفل يدوي",
      15: "فتح عبر رمز مرور (مؤقت)",
      29: "فتح عبر المفتاح الفيزيائي",
      32: "فتح عن بعد (Gateway)",
      33: "قفل عن بعد (Gateway)",
    };
    return types[type] || `عملية أخرى (${type})`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.main}>
        <h1 style={styles.title}>TTLock API</h1>
        {accessToken && (
          <div style={{ width: '100%', textAlign: 'left' }}>
            <button onClick={logout} style={styles.logoutButton}>
              تسجيل الخروج
            </button>
          </div>
        )}

        {!accessToken ? (
          <div style={styles.formContainer}>
            <p style={styles.subtitle}>أدخل بيانات حسابك للدخول</p>
            <input
              type="text"
              placeholder="البريد الإلكتروني"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
            />
            <input
              type="password"
              placeholder="كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              disabled={loading === 'login'}
            />
            <button onClick={getAccessToken} style={styles.primaryButton} disabled={loading === 'login'}>
              {loading === 'login' ? "جاري الدخول..." : "دخول"}
            </button>
          </div>
        ) : (
          <div style={{ width: '100%' }}>
            <button onClick={getLocks} disabled={loading === 'locks'} style={styles.primaryButton}>
              {loading === 'locks' ? "جاري تحديث الأقفال..." : "تحديث قائمة الأقفال"}
            </button>

            {locks.length > 0 && (
              <div style={styles.locksContainer}>
                {locks.map((lock, index) => (
                  <div key={lock.lockId || `lock-${index}`} style={styles.lockCard}>
                    <div style={styles.lockCardHeader}>
                      <span style={styles.lockName}>{lock.lockAlias || lock.lockName}</span>
                      <span style={getBatteryStyle(lock.electricQuantity)}>
                        {lock.electricQuantity}% <i className="fas fa-battery-full"></i>
                      </span>
                    </div>
                    <p style={styles.lockId}>ID: {lock.lockId}</p>
                    <div style={styles.cardActions}>
                        <button
                         onClick={() => unlockLock(lock.lockId)}
                         disabled={loading === `unlock_${lock.lockId}`}
                         style={{ ...styles.secondaryButton, backgroundColor: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}
                       >
                         {loading === `unlock_${lock.lockId}` ? "جاري الفتح..." : "فتح القفل (أونلاين)"}
                       </button>
                       <button
                         onClick={() => unlockViaBluetooth(lock)}
                         style={{ ...styles.secondaryButton, backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#bae6fd' }}
                       >
                         فتح بلوتوث (قريب)
                       </button>
                       <button
                         onClick={() => getRecords(lock.lockId)}
                        disabled={loading === `records_${lock.lockId}`}
                        style={styles.secondaryButton}
                      >
                        {loading === `records_${lock.lockId}` ? "جاري التحميل..." : "عرض السجلات"}
                      </button>
                      <button
                        onClick={() => listPasscodes(lock)}
                        disabled={loading === `passcodes_${lock.lockId}`}
                        style={styles.secondaryButton}
                      >
                        إدارة رموز المرور
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {isModalOpen && selectedLock && (
              <div style={styles.modalBackdrop}>
                <div style={styles.modalContent}>
                  <h3 style={styles.modalTitle}>إدارة رموز المرور لـ "{selectedLock.lockAlias || selectedLock.lockName}"</h3>
                  
                  {selectedLock.noKeyPwd && (
                     <div style={styles.adminCodeBox}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                         <span style={styles.adminLabel}>رمز المشرف (Admin Code):</span>
                         <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>هذا الرمز الأساسي للقفل</span>
                       </div>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <strong style={styles.adminCode}>{selectedLock.noKeyPwd}</strong>
                         <button 
                           onClick={() => {
                             navigator.clipboard.writeText(selectedLock.noKeyPwd);
                             alert('تم نسخ رمز المشرف');
                           }}
                           style={styles.copyButton}
                         >
                           نسخ
                         </button>
                       </div>
                     </div>
                   )}

                  <div style={styles.addPasscodeForm}>
                    <input type="text" placeholder="الاسم (مثلاً: عامل نظافة)" id="passcodeName" style={styles.input} />
                    <input type="text" placeholder="الرمز (4-9 أرقام)" id="passcode" style={styles.input} />
                    <button 
                      onClick={() => {
                        const name = (document.getElementById('passcodeName') as HTMLInputElement).value;
                        const code = (document.getElementById('passcode') as HTMLInputElement).value;
                        if (name && code) addPasscode(code, name);
                      }}
                      style={styles.primaryButton}
                      disabled={loading === 'add_passcode'}
                    >
                      {loading === 'add_passcode' ? "جاري الإضافة..." : "إضافة رمز دائم"}
                    </button>
                  </div>
                  <h4 style={styles.passcodeListTitle}>الرموز الحالية:</h4>
                  {loading === `passcodes_${selectedLock.lockId}` ? <p>جاري تحميل الرموز...</p> : 
                    passcodes.length > 0 ? (
                      <ul style={styles.passcodeList}>
                          {passcodes.map((p, index) => (
                            <li key={p.keyboardPwdId || `pass-${index}`} style={styles.passcodeItem}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                                <span style={{ fontWeight: '700', color: '#111' }}>{p.keyboardPwdName || "بدون اسم"}</span>
                                <strong style={{ fontSize: '1.2rem', color: '#2563eb' }}>{p.keyboardPwd}</strong>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                                <span style={p.type === 1 ? styles.permanentBadge : styles.temporaryBadge}>
                                  {p.type === 1 ? 'دائم' : 'مؤقت'}
                                </span>
                                <span style={{ fontSize: '0.75rem', color: '#666' }}>ID: {p.keyboardPwdId}</span>
                              </div>
                            </li>
                          ))}
                      </ul>
                    ) : <p>لا توجد رموز مرور حالياً.</p>
                  }
                  <button onClick={() => setIsModalOpen(false)} style={styles.closeButton}>إغلاق</button>
                </div>
              </div>
            )}

            {records.length > 0 && (
              <div style={styles.recordsContainer}>
                <h3 style={styles.recordsTitle}>آخر 20 سجل دخول</h3>
                <table style={styles.recordsTable}>
                  <thead>
                    <tr>
                      <th style={styles.tableHeader}>المستخدم</th>
                      <th style={styles.tableHeader}>نوع العملية</th>
                      <th style={styles.tableHeader}>الوقت والتاريخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record, index) => (
                      <tr key={record.recordId || `record-${index}-${record.lockDate}`}>
                        <td style={styles.tableCell}>{record.username || "غير معروف"}</td>
                        <td style={styles.tableCell}>{formatRecordType(record.recordType)}</td>
                        <td style={styles.tableCell}>{new Date(record.lockDate).toLocaleString('ar-EG')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={styles.errorBox}>
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- الأنماط الجديدة ---
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    direction: 'rtl',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    padding: '1rem', // Reduced padding for mobile
  },
  main: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.5rem',
  },
  title: {
    fontSize: '2rem', // Smaller title for mobile
    color: '#1a1a1a',
    fontWeight: 'bold',
    marginBottom: '0.2rem',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: '#444',
    marginBottom: '1.5rem',
  },
  formContainer: {
    width: '100%',
    maxWidth: '400px',
    padding: '2.5rem',
    backgroundColor: '#fff',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
    border: '1px solid #eaeaea',
  },
  input: {
    padding: '1rem 1.2rem',
    borderRadius: '10px',
    border: '2px solid #eee',
    fontSize: '1rem',
    textAlign: 'right',
    transition: 'border-color 0.2s',
    color: '#1a1a1a',
  },
  primaryButton: {
    padding: '1rem 1.5rem',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    transition: 'all 0.2s',
    boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
  },
  logoutButton: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '0.5rem 1rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '600',
    transition: 'all 0.2s',
  },
  locksContainer: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1.5rem',
    marginTop: '2rem',
  },
  lockCard: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    transition: 'all 0.2s',
    cursor: 'default',
  },
  lockCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  lockName: {
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#111',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  lockId: {
    fontSize: '0.85rem',
    color: '#666',
    backgroundColor: '#f8fafc',
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    alignSelf: 'flex-start',
  },
  cardActions: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap', // Allow wrapping on mobile
    gap: '0.6rem',
    marginTop: '0.8rem',
  },
  secondaryButton: {
    flex: '1 1 calc(50% - 0.6rem)', // 2 buttons per row on small screens, or 1 if very small
    minWidth: '120px',
    padding: '0.8rem 0.5rem',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#334155',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  recordsContainer: {
    width: '100%',
    marginTop: '3rem',
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
  },
  recordsTitle: {
    fontSize: '1.75rem',
    marginBottom: '2rem',
    color: '#1a1a1a',
    fontWeight: '800',
    textAlign: 'center',
  },
  recordsTable: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0 0.5rem',
  },
  tableHeader: {
    padding: '1rem',
    textAlign: 'right',
    color: '#475569',
    fontWeight: '700',
    fontSize: '0.95rem',
    borderBottom: '2px solid #f1f5f9',
  },
  tableCell: {
    padding: '1rem',
    textAlign: 'right',
    color: '#1e293b',
    fontSize: '0.95rem',
    backgroundColor: '#fff',
    borderBottom: '1px solid #f1f5f9',
  },
  errorBox: {
    width: '100%',
    maxWidth: '500px',
    padding: '1.2rem',
    borderRadius: '12px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fee2e2',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: '1rem',
  },
  modalBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: '1.5rem', // Reduced padding
    borderRadius: '20px',
    width: '92%',
    maxWidth: '500px',
    maxHeight: '90vh', // Prevent from going off screen
    overflowY: 'auto', // Allow scrolling within modal
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalTitle: {
    fontSize: '1.5rem',
    color: '#111',
    fontWeight: '800',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '1.2rem',
  },
  adminCodeBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#fff7ed',
    borderRadius: '12px',
    border: '1px solid #ffedd5',
    color: '#9a3412',
  },
  adminLabel: {
    fontSize: '1rem',
    fontWeight: '700',
  },
  adminCode: {
    fontSize: '1.25rem',
    fontWeight: '800',
    letterSpacing: '1px',
  },
  copyButton: {
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid #ff964d',
    backgroundColor: '#fff',
    color: '#9a3412',
    fontSize: '0.85rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  addPasscodeForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  passcodeListTitle: {
    fontSize: '1.3rem',
    color: '#1e293b',
    fontWeight: '700',
    marginTop: '1rem',
  },
  passcodeList: {
    listStyle: 'none',
    padding: 0,
    maxHeight: '300px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  passcodeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#fff',
    borderRadius: '10px',
    border: '1px solid #f1f5f9',
    color: '#1e293b',
  },
  permanentBadge: {
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  temporaryBadge: {
    padding: '0.2rem 0.5rem',
    borderRadius: '6px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: '0.75rem',
    fontWeight: '700',
  },
  closeButton: {
    padding: '1rem',
    borderRadius: '10px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#64748b',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '1rem',
    transition: 'all 0.2s',
  },
};


const getBatteryStyle = (level: number): React.CSSProperties => {
  let color = '#16a34a'; // Green 600
  let bgColor = '#f0fdf4';
  let borderColor = '#bbf7d0';
  
  if (level <= 20) {
    color = '#dc2626'; // Red 600
    bgColor = '#fef2f2';
    borderColor = '#fecaca';
  } else if (level <= 50) {
    color = '#ca8a04'; // Yellow 600
    bgColor = '#fefce8';
    borderColor = '#fef08a';
  }
  
  return {
    padding: '0.3rem 0.6rem',
    borderRadius: '8px',
    backgroundColor: bgColor,
    color: color,
    border: `1px solid ${borderColor}`,
    fontSize: '0.8rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  };
};
