
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
  const [searchTerm, setSearchTerm] = useState("");
  const [modelFilter, setModelFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name_asc");
  const [activeTab, setActiveTab] = useState("locks"); // 'locks' or 'records'

  // استخراج قائمة الموديلات الفريدة من الأقفال
  const availableModels = ["all", ...new Set(locks.map(l => (l.lockAlias || l.lockName || "").split('_')[0]).filter(m => m))];

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
    // لا نحتاج لإخفاء السجلات هنا، سنقوم بتحديث القائمة فقط
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
        setActiveTab('records'); // الانتقال لتبويب السجلات تلقائياً
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
      alert("1. جارٍ طلب جهاز بلوتوث...");
      const device = await bluetooth.requestDevice({
        filters: [{ namePrefix: 'S503_' }, { services: ['00001910-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['00001910-0000-1000-8000-00805f9b34fb']
      });
      alert(`2. تم اختيار الجهاز: ${device.name}`);

      // جلب مفاتيح التشفير أثناء/بعد اختيار الجهاز
      alert("3. جارٍ جلب مفاتيح التشفير من الخادم...");
      const detailResponse = await fetch("/api/ttlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: 'get_lock_detail', accessToken, lockId: lock.lockId }),
      });
      const lockDetail = await detailResponse.json();

      if (!detailResponse.ok) {
        throw new Error(`فشل جلب مفاتيح التشفير: ${lockDetail.errormsg || "خطأ غير معروف"}`);
      }
      alert("4. تم استلام مفاتيح التشفير بنجاح.");

      const { aesKeyStr, lockKey } = lockDetail;

      alert("5. جارٍ الاتصال بالقفل (GATT Connect)...");
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('00001910-0000-1000-8000-00805f9b34fb');
      alert("6. تم الاتصال بالخدمة الرئيسية. جارٍ الحصول على الخصائص...");

      // --- آلية إعادة المحاولة الذكية ---
      let charWrite, charNotify;
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        try {
          charWrite = await service?.getCharacteristic('00001911-0000-1000-8000-00805f9b34fb');
          charNotify = await service?.getCharacteristic('00001912-0000-1000-8000-00805f9b34fb');
          if (charWrite && charNotify) {
            break; // نجحنا، اخرج من الحلقة
          }
        } catch (e) {
          if (attempts === maxAttempts - 1) {
            throw e; // فشلت كل المحاولات، ارمِ الخطأ الأخير
          }
          alert(`محاولة ${attempts + 1} فشلت، سيتم إعادة المحاولة بعد 100ms`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        attempts++;
      }
      // --- نهاية آلية إعادة المحاولة ---

      alert("7. تم الحصول على خصائص القراءة والكتابة.");

      await charNotify?.startNotifications();
      charNotify?.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        const hexString = Array.from(new Uint8Array(value.buffer)).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log("Received notification (Hex):", hexString);
        alert(`إشعار من القفل: ${hexString}`);
      });

      const sendEncryptedCommand = async (commandHex: string) => {
        const key = CryptoJS.enc.Hex.parse(aesKeyStr);
        const data = CryptoJS.enc.Hex.parse(commandHex);
        const encrypted = CryptoJS.AES.encrypt(data, key, {
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.NoPadding
        });
        
        const ciphertextHex = encrypted.ciphertext.toString();
        const bytes = new Uint8Array(ciphertextHex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(ciphertextHex.substring(i * 2, i * 2 + 2), 16);
        }
        await charWrite?.writeValue(bytes);
      };

      const buildUnlockPacket = () => {
        const header = "7f01";
        const cmd = "01";
        const lockKeyHex = lockKey;
        const timestamp = Math.floor(Date.now() / 1000);
        const tsHex = timestamp.toString(16).padStart(8, '0');
        
        const dataHex = lockKeyHex + tsHex;
        const lenHex = (dataHex.length / 2).toString(16).padStart(2, '0');
        
        const packetNoChecksum = header + cmd + lenHex + dataHex;
        
        let sum = 0;
        for (let i = 0; i < packetNoChecksum.length; i += 2) {
          sum += parseInt(packetNoChecksum.substring(i, i + 2), 16);
        }
        const checksumHex = (sum % 256).toString(16).padStart(2, '0');
        
        return packetNoChecksum + checksumHex;
      };

      alert("8. جارٍ بناء حزمة الفتح المشفرة...");
      const unlockPacket = buildUnlockPacket();
      
      alert(`9. جارٍ إرسال الأمر المشفر: ${unlockPacket}`);
      await sendEncryptedCommand(unlockPacket);
      
      alert("10. تم إرسال إشارة الفتح بنجاح! يرجى التحقق من القفل.");

    } catch (err: any) {
      console.error("Bluetooth Error:", err);
      const errorMessage = `خطأ في البلوتوث: ${err.message}`;
      setError(errorMessage);
      alert(errorMessage);
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

  const filteredLocks = locks
    .filter(lock => {
      const name = (lock.lockAlias || lock.lockName || "").toLowerCase();
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      const modelPrefix = name.split('_')[0];
      const matchesModel = modelFilter === "all" || modelPrefix.toLowerCase() === modelFilter.toLowerCase();
      return matchesSearch && matchesModel;
    })
    .sort((a, b) => {
      const nameA = (a.lockAlias || a.lockName || "").toLowerCase();
      const nameB = (b.lockAlias || b.lockName || "").toLowerCase();

      if (sortBy === "name_asc") return nameA.localeCompare(nameB);
      if (sortBy === "name_desc") return nameB.localeCompare(nameA);
      
      // ترتيب حسب الرقم (الدور/الغرفة) - استخراج أول رقم يظهر في الاسم
      if (sortBy === "floor") {
        const numA = parseInt(nameA.match(/\d+/)?.[0] || "0");
        const numB = parseInt(nameB.match(/\d+/)?.[0] || "0");
        return numA - numB;
      }
      
      return 0;
    });

  return (
    <div className="mobile-tight-padding" style={styles.container}>
      <div style={styles.main}>
        <div style={styles.header}>
          <h1 style={styles.title}>إدارة الأقفال الذكية</h1>
          {accessToken && (
            <button onClick={logout} style={styles.logoutButton}>
              خروج
            </button>
          )}
        </div>

        {!accessToken ? (
          <div style={styles.loginCard}>
            <div style={styles.loginHeader}>
              <h2 style={{ margin: 0, color: '#1e293b' }}>تسجيل الدخول</h2>
              <p style={{ color: '#64748b', marginTop: '0.5rem' }}>أدخل بيانات حساب TTLock الخاص بك</p>
            </div>
            <div style={styles.formContainer}>
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
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* نظام التبويبات (Tabs) */}
            <div style={styles.tabsContainer}>
              <button 
                onClick={() => setActiveTab('locks')} 
                style={activeTab === 'locks' ? styles.activeTab : styles.inactiveTab}
              >
                <span style={{ fontSize: '1.2rem' }}>🔒</span>
                قائمة الأقفال
              </button>
              <button 
                onClick={() => setActiveTab('records')} 
                style={activeTab === 'records' ? styles.activeTab : styles.inactiveTab}
              >
                <span style={{ fontSize: '1.2rem' }}>📋</span>
                سجل العمليات {records.length > 0 && `(${records.length})`}
              </button>
            </div>

            {activeTab === 'locks' && (
              <>
                {/* أزرار التحكم العلوية */}
                <div style={styles.topActions}>
                  <button onClick={getLocks} disabled={loading === 'locks'} style={styles.actionButton}>
                    <span style={{ fontSize: '1.2rem' }}>🔄</span>
                    {loading === 'locks' ? "جاري التحديث..." : "تحديث الأقفال"}
                  </button>
                </div>

            <div style={styles.filterSection}>
              <div style={{ flex: '1 1 100%', position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={styles.filterLabel}>البحث:</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="اسم القفل..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.filterInput}
                  />
                  <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#475569' }}>🔍</span>
                </div>
              </div>

              <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={styles.filterLabel}>الموديل:</label>
                <select 
                  value={modelFilter}
                  onChange={(e) => setModelFilter(e.target.value)}
                  style={styles.filterSelect}
                >
                  {availableModels.map(model => (
                    <option key={model} value={model}>
                      {model === "all" ? "الكل" : model}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: '1 1 45%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={styles.filterLabel}>ترتيب:</label>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={styles.filterSelect}
                >
                  <option value="name_asc">الاسم (أ-ي)</option>
                  <option value="name_desc">الاسم (ي-أ)</option>
                  <option value="floor">رقم الغرفة</option>
                </select>
              </div>
            </div>

            {locks.length > 0 && (
              <div className="mobile-grid-1" style={styles.locksContainer}>
                {filteredLocks.length > 0 ? (
                  filteredLocks.map((lock, index) => (
                    <div key={lock.lockId || `lock-${index}`} style={styles.lockCard}>
                      <div style={styles.lockCardHeader}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span style={styles.lockName}>{lock.lockAlias || lock.lockName}</span>
                          <span style={styles.lockIdBadge}>ID: {lock.lockId}</span>
                        </div>
                        <span style={getBatteryStyle(lock.electricQuantity)}>
                          {lock.electricQuantity}% 🔋
                        </span>
                      </div>
                      
                      <div style={styles.cardActions}>
                          <button
                            onClick={() => unlockLock(lock.lockId)}
                            disabled={loading === `unlock_${lock.lockId}`}
                            style={{ ...styles.secondaryButton, backgroundColor: '#ecfdf5', color: '#059669', borderColor: '#d1fae5' }}
                          >
                            {loading === `unlock_${lock.lockId}` ? "جاري..." : "فتح أونلاين"}
                          </button>
                          <button
                            onClick={() => unlockViaBluetooth(lock)}
                            style={{ ...styles.secondaryButton, backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#dbeafe' }}
                          >
                            فتح بلوتوث
                          </button>
                          <button
                            onClick={() => getRecords(lock.lockId)}
                            disabled={loading === `records_${lock.lockId}`}
                            style={styles.secondaryButton}
                          >
                            {loading === `records_${lock.lockId}` ? "..." : "السجلات"}
                          </button>
                          <button
                            onClick={() => listPasscodes(lock)}
                            disabled={loading === `passcodes_${lock.lockId}`}
                            style={styles.secondaryButton}
                          >
                            الرموز
                          </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: '#64748b', backgroundColor: '#fff', borderRadius: '16px' }}>
                    لا توجد أقفال تطابق بحثك.
                  </div>
                )}
              </div>
            )}
              </>
            )}

            {isModalOpen && selectedLock && (
              <div style={styles.modalBackdrop}>
                <div style={styles.modalContent}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #f1f5f9', paddingBottom: '1.2rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ ...styles.modalTitle, borderBottom: 'none', paddingBottom: 0, margin: 0 }}>
                      إدارة رموز المرور لـ "{selectedLock.lockAlias || selectedLock.lockName}"
                    </h3>
                    {selectedLock.lockName && selectedLock.lockName.startsWith('S503') && (
                      <span style={{ 
                        backgroundColor: '#eff6ff', 
                        color: '#1e40af', 
                        padding: '0.4rem 0.8rem', 
                        borderRadius: '8px', 
                        fontSize: '0.9rem', 
                        fontWeight: 'bold',
                        border: '1px solid #bfdbfe'
                      }}>
                        موديل: {selectedLock.lockName}
                      </span>
                    )}
                  </div>
                  
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

            {activeTab === 'records' && (
              <div id="records-section" style={styles.recordsContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ ...styles.recordsTitle, margin: 0 }}>آخر العمليات المسجلة</h3>
                  {records.length > 0 && (
                    <button 
                      onClick={() => setRecords([])} 
                      style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      مسح السجل
                    </button>
                  )}
                </div>
                
                {records.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
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
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                    <span style={{ fontSize: '3rem', display: 'block', marginBottom: '1rem' }}>📭</span>
                    لا توجد سجلات لعرضها حالياً. انقر على زر "السجلات" الخاص بأي قفل لعرض نشاطه هنا.
                  </div>
                )}
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
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    padding: '0.8rem',
  },
  tabsContainer: {
    display: 'flex',
    gap: '0.3rem',
    width: '100%',
    backgroundColor: '#fff',
    padding: '0.4rem',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },
  activeTab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.7rem 0.4rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  inactiveTab: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.7rem 0.4rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#64748b',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  main: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  },
  title: {
    fontSize: '1.3rem',
    color: '#0f172a',
    fontWeight: '800',
    margin: 0,
  },
  header: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem 0',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '0.5rem',
  },
  loginCard: {
    width: '100%',
    maxWidth: '450px',
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '2rem',
    boxShadow: '0 15px 25px rgba(0,0,0,0.05)',
    marginTop: '1.5rem',
  },
  loginHeader: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  topActions: {
    display: 'flex',
    gap: '0.8rem',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '0.7rem',
    borderRadius: '10px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  filterSection: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '0.8rem',
    width: '100%',
    backgroundColor: '#fff',
    padding: '1rem',
    borderRadius: '14px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
  },
  filterLabel: {
    fontSize: '0.85rem',
    fontWeight: '700',
    color: '#334155',
    marginBottom: '0.1rem',
  },
  filterInput: {
    width: '100%',
    padding: '0.7rem 0.8rem 0.7rem 2.2rem',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  filterSelect: {
    width: '100%',
    padding: '0.7rem 0.5rem',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    fontSize: '0.9rem',
    backgroundColor: '#f8fafc',
    cursor: 'pointer',
    color: '#0f172a',
  },
  lockIdBadge: {
    fontSize: '0.7rem',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    padding: '0.1rem 0.3rem',
    borderRadius: '4px',
    width: 'fit-content',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#444',
    marginBottom: '1rem',
  },
  formContainer: {
    width: '100%',
    padding: '1.5rem',
    backgroundColor: '#fff',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  input: {
    padding: '0.8rem',
    borderRadius: '8px',
    border: '1.5px solid #eee',
    fontSize: '0.95rem',
    textAlign: 'right',
    color: '#1a1a1a',
  },
  primaryButton: {
    padding: '0.9rem',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
  },
  logoutButton: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#dc2626',
    padding: '0.4rem 0.8rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: '600',
  },
  locksContainer: {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  lockCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  lockCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.2rem',
  },
  lockName: {
    fontSize: '1.1rem',
    fontWeight: '800',
    color: '#111',
  },
  cardActions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
    marginTop: '0.4rem',
  },
  secondaryButton: {
    padding: '0.6rem 0.3rem',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#334155',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  recordsContainer: {
    width: '100%',
    marginTop: '1rem',
    backgroundColor: '#fff',
    borderRadius: '14px',
    padding: '1.2rem',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    border: '1px solid #f0f0f0',
  },
  recordsTitle: {
    fontSize: '1.3rem',
    marginBottom: '1rem',
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
    padding: '0.8rem',
    textAlign: 'right',
    color: '#475569',
    fontWeight: '700',
    fontSize: '0.85rem',
    borderBottom: '2px solid #f1f5f9',
  },
  tableCell: {
    padding: '0.8rem',
    textAlign: 'right',
    color: '#1e293b',
    fontSize: '0.85rem',
    backgroundColor: '#fff',
    borderBottom: '1px solid #f1f5f9',
  },
  errorBox: {
    width: '100%',
    maxWidth: '500px',
    padding: '1rem',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    color: '#b91c1c',
    border: '1px solid #fee2e2',
    textAlign: 'center',
    fontWeight: '600',
    marginTop: '0.5rem',
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
    padding: '1.2rem',
    borderRadius: '20px',
    width: '92%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  modalTitle: {
    fontSize: '1.2rem',
    color: '#111',
    fontWeight: '800',
    borderBottom: '2px solid #f1f5f9',
    paddingBottom: '0.8rem',
  },
  adminCodeBox: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem',
    backgroundColor: '#fff7ed',
    borderRadius: '10px',
    border: '1px solid #ffedd5',
    color: '#9a3412',
  },
  adminLabel: {
    fontSize: '0.9rem',
    fontWeight: '700',
  },
  adminCode: {
    fontSize: '1.1rem',
    fontWeight: '800',
    letterSpacing: '1px',
  },
  copyButton: {
    padding: '0.3rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid #ff964d',
    backgroundColor: '#fff',
    color: '#9a3412',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  addPasscodeForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
    padding: '1.2rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },
  passcodeListTitle: {
    fontSize: '1.1rem',
    color: '#1e293b',
    fontWeight: '700',
    marginTop: '0.5rem',
  },
  passcodeList: {
    listStyle: 'none',
    padding: 0,
    maxHeight: '250px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  passcodeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.8rem',
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #f1f5f9',
    color: '#1e293b',
  },
  permanentBadge: {
    padding: '0.2rem 0.4rem',
    borderRadius: '5px',
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '0.7rem',
    fontWeight: '700',
  },
  temporaryBadge: {
    padding: '0.2rem 0.4rem',
    borderRadius: '5px',
    backgroundColor: '#eff6ff',
    color: '#2563eb',
    fontSize: '0.7rem',
    fontWeight: '700',
  },
  closeButton: {
    padding: '0.8rem',
    borderRadius: '8px',
    border: '2px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#64748b',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    marginTop: '0.5rem',
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
    padding: '0.2rem 0.4rem',
    borderRadius: '6px',
    backgroundColor: bgColor,
    color: color,
    border: `1px solid ${borderColor}`,
    fontSize: '0.75rem',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  };
};
