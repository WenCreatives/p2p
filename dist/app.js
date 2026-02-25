function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// App.jsx — jordanmwinukatz P2P Trading (Canvas-ready SPA)
// Fully self-contained: no shadcn, no lucide, no external UI deps.

const {
  useState,
  useEffect,
  useRef,
  useMemo
} = React;

/* =========================
   Brand & Global Settings
   ========================= */
const BUSINESS_NAME = "jordanmwinukatz P2P Trading";
const WHATSAPP_NUMBER = "+255714107557";
const SUPPORT_EMAIL = "jordanmwinuka@gmail.com";
const LOGO_URL = "/logo.png"; // optional — shows gradient placeholder if missing
const FAVICON_URL = "/favicon.png"; // optional

/* Helpers */
const wa = text => `https://wa.me/${WHATSAPP_NUMBER.replace(/[^\d]/g, "")}?text=${encodeURIComponent(text)}`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const fmt = n => {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString();
};
const fmtUsd = n => {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
const toNumeric = value => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[,\s]/g, "");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
};

/* Set favicon (SPA-friendly) */
(function setFavicon() {
  try {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = FAVICON_URL;
  } catch { }
})();

/* ---------- Minimal UI Primitives ---------- */
const Button = ({
  className = "",
  as = "button",
  href,
  children,
  ...rest
}) => {
  const base = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 transition text-sm font-medium min-h-[44px]";
  if (as === "a") return /*#__PURE__*/React.createElement("a", _extends({
    href: href,
    className: `${base} ${className}`
  }, rest), children);
  return /*#__PURE__*/React.createElement("button", _extends({
    className: `${base} ${className}`
  }, rest), children);
};
const Card = ({
  className = "",
  children
}) => /*#__PURE__*/React.createElement("div", {
  className: `bg-black/40 border border-white/10 rounded-2xl ${className}`
}, children);
const CardHeader = ({
  className = "",
  children
}) => /*#__PURE__*/React.createElement("div", {
  className: `p-4 border-b border-white/10 ${className}`
}, children);
const CardTitle = ({
  className = "",
  children
}) => /*#__PURE__*/React.createElement("div", {
  className: `text-base font-semibold ${className}`
}, children);
const CardContent = ({
  className = "",
  children
}) => /*#__PURE__*/React.createElement("div", {
  className: `p-4 ${className}`
}, children);
const Input = ({
  className = "",
  ...rest
}) => /*#__PURE__*/React.createElement("input", _extends({
  className: `w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-white/20 ${className}`
}, rest));
const Textarea = ({
  className = "",
  ...rest
}) => /*#__PURE__*/React.createElement("textarea", _extends({
  className: `w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-white/20 ${className}`
}, rest));
const Modal = ({
  open,
  onClose,
  children,
  maxWidth = "max-w-2xl"
}) => {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[90] flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-black/70",
    onClick: onClose
  }), /*#__PURE__*/React.createElement("div", {
    className: `relative w-[95vw] ${maxWidth} bg-black/90 text-white border border-white/10 rounded-2xl shadow-xl`
  }, children));
};
const Logo = ({
  className = "h-7 w-auto"
}) => {
  const [ok, setOk] = useState(false);
  return /*#__PURE__*/React.createElement(React.Fragment, null, !ok && /*#__PURE__*/React.createElement("div", {
    className: "h-7 w-7 rounded-xl bg-gradient-to-tr from-yellow-500/20 via-yellow-400/10 to-cyan-500/20"
  }), /*#__PURE__*/React.createElement("img", {
    src: LOGO_URL,
    alt: "logo",
    className: `${className} ${ok ? "" : "hidden"}`,
    onLoad: () => setOk(true)
  }));
};
const Section = ({
  id,
  children,
  className = ""
}) => /*#__PURE__*/React.createElement("section", {
  id: id,
  className: `py-12 sm:py-16 md:py-24 ${className}`
}, /*#__PURE__*/React.createElement("div", {
  className: "w-full mx-auto px-3 sm:px-4"
}, children));
const Title = ({
  k,
  sub
}) => /*#__PURE__*/React.createElement("div", {
  className: "mb-10"
}, /*#__PURE__*/React.createElement("h2", {
  className: "text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-300 to-cyan-400"
}, k), sub && /*#__PURE__*/React.createElement("p", {
  className: "text-white/70 mt-2 max-w-2xl"
}, sub));

/* =========================
   MAIN APP
   ========================= */
function App() {
  const gradientBg = "bg-gradient-to-tr from-yellow-500/20 via-yellow-400/10 to-cyan-500/20";

  /* AUTH + ORDER */
  const [orderOpen, setOrderOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [isPwdVisible, setPwdVisible] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [order, setOrder] = useState({
    name: "",
    whatsapp: "",
    amount: "",
    currency: "TZS",
    platform: "binance",
    side: "buy",
    message: ""
  });
  const [createdOrderId, setCreatedOrderId] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  const [exchangeEmail, setExchangeEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [toast, setToast] = useState(null);

  /* ORDER WIZARD STATE */
  const [wizardStep, setWizardStep] = useState(1);
  // Auth gate before continuing the order wizard
  const [authUser, setAuthUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('authUser') || 'null');
    } catch {
      return null;
    }
  });
  const [userSubmissions, setUserSubmissions] = useState([]);
  const [showUserDashboard, setShowUserDashboard] = useState(false);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [dashboardTab, setDashboardTab] = useState('orders'); // 'orders' | 'profile' | 'settings'
  const [quickOrderOpen, setQuickOrderOpen] = useState(false);
  const wizardEmailRef = useRef(null);
  const wizardUidRef = useRef(null);
  const wizardTzsInputRef = useRef(null);
  const wizardUsdtInputRef = useRef(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: ''
  });
  const [settingsForm, setSettingsForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [settingsMessage, setSettingsMessage] = useState(null);
  const [profilePicture, setProfilePicture] = useState(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'create' | 'forgot'
  const [authForm, setAuthForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirm: '',
    agree: false,
    remember: true
  });
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [authShowPw, setAuthShowPw] = useState(false);
  const [authShowPw2, setAuthShowPw2] = useState(false);
  const [authToast, setAuthToast] = useState(null);
  const [wizardSide, setWizardSide] = useState(""); // "Buy" | "Sell"
  const [wizardRoute, setWizardRoute] = useState(""); // "stay" | "p2p"
  const [wizardUnit, setWizardUnit] = useState(""); // "TZS" | "USDT"
  const [wizardTzs, setWizardTzs] = useState("");
  const [wizardUsdt, setWizardUsdt] = useState("");
  const [wizardAmtErr, setWizardAmtErr] = useState("");
  const [wizardP2pPlatform, setWizardP2pPlatform] = useState("");

  // Analytics tracking functions
  const trackWizardStep = (step, actionType, paymentMethod = null, routeType = null) => {
    if (window.analytics) {
      window.analytics.trackWizardStep(step, actionType, paymentMethod, routeType);
    }
  };
  const trackButtonClick = (buttonName, location = '') => {
    if (window.analytics) {
      window.analytics.trackButtonClick(buttonName, location);
    }
  };
  const trackWhatsAppClick = (location = '') => {
    if (window.analytics) {
      window.analytics.trackWhatsAppClick(location);
    }
  };

  // Track page load
  useEffect(() => {
    if (window.analytics) {
      window.analytics.trackPageView();
    }
  }, []);

  // Check for login parameter in URL (for admin redirects)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('login') === '1') {
      setAuthMode('login');
      setAuthOpen(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  const [wizardPayment, setWizardPayment] = useState("");
  const [wizardSellAccMode, setWizardSellAccMode] = useState(""); // "saved" | "new"
  const [wizardSellAccName, setWizardSellAccName] = useState("");
  const [wizardSellAccNumber, setWizardSellAccNumber] = useState("");
  const [wizardSaveAccount, setWizardSaveAccount] = useState(true); // Default to true - save account for future use
  const [wizardSelectedSavedAccountId, setWizardSelectedSavedAccountId] = useState(null); // ID of selected saved account
  const [wizardPlatform, setWizardPlatform] = useState("");
  const [wizardUserEmail, setWizardUserEmail] = useState("");
  const [wizardUserUID, setWizardUserUID] = useState("");
  const [wizardFiles, setWizardFiles] = useState([]);
  const [wizardFinalSubmitted, setWizardFinalSubmitted] = useState(false); // set true only after final submit
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent double submission
  // Live USDT→TZS rate used across wizard & prices (initial fallback 2650)
  const [liveRate, setLiveRate] = useState(2650);

  // These constants will be defined after wizard rates are set

  // P2P market URLs (Binance uses your specific codes)
  const WIZARD_P2P_URLS = (side, platform) => {
    if (platform === "Binance") {
      return side === "Buy" ? "https://c2c.binance.com/en/adv?code=j15stHvu1u4" : "https://c2c.binance.com/en/adv?code=HrOzHzvC5uj";
    }
    const map = {
      OKX: "https://www.okx.com/p2p-markets/tz-usdt",
      "MEXC Exchange": "https://www.mexc.com/p2p",
      KuCoin: "https://www.kucoin.com/p2p/buy/USDT?fiat=TZS",
      BYBIT: "https://www.bybit.com/fiat/trade/p2p/USDT?fiat=TZS",
      Bitget: "https://www.bitget.com/p2p",
      Remitano: "https://remitano.com/tz/usdt/tzs"
    };
    return map[platform] || "https://example.com";
  };
  // Payment method to account number mapping for buy orders
  const WIZARD_BUY_PAYMENT_ACCOUNTS = {
    "CRDB Bank": "0152961669100",
    "NMB Bank": "42710015482",
    "M-Pesa": "701103",
    "Tigo Pesa": "557106",
    "Airtel Money": ""
  };

  // Get receiver info based on selected payment method (reactive to wizardPayment changes)
  const WIZARD_BUY_RECEIVER = useMemo(function () {
    const paymentMethod = wizardPayment || "CRDB Bank";
    const accountNumber = WIZARD_BUY_PAYMENT_ACCOUNTS[paymentMethod];
    // If account number is undefined, fall back to CRDB. If it's empty string, keep it empty.
    return {
      bank: paymentMethod,
      name: "Jordan Timoth Mwinuka",
      number: accountNumber !== undefined ? accountNumber : WIZARD_BUY_PAYMENT_ACCOUNTS["CRDB Bank"]
    };
  }, [wizardPayment]);
  const WIZARD_SELL_RECEIVE_MAP = {
    Binance: {
      email: "jordanmwinuka@protonmail.com",
      uid: "36847668",
      username: "jordanmwinukatz"
    },
    Bitget: {
      email: "",
      uid: "",
      username: ""
    },
    BYBIT: {
      email: "",
      uid: "",
      username: ""
    },
    KuCoin: {
      email: "",
      uid: "",
      username: ""
    },
    OKX: {
      email: "",
      uid: "",
      username: ""
    },
    Remitano: {
      email: "",
      uid: "",
      username: ""
    },
    "MEXC Exchange": {
      email: "",
      uid: "",
      username: ""
    }
  };

  // Saved payout accounts for the user (sell • stay-here). Loaded from database.
  const [wizardUserSavedAccounts, setWizardUserSavedAccounts] = useState({});

  /* ORDER WIZARD HELPERS */
  // wizardTzsMin will be calculated after wizardEffectiveRate is defined
  const wizardStepCount = wizardSide === "Buy" ? 8 : 7; // SELL has 7 steps (Preview + Send)

  // Unit sync (stay route)
  const wizardSyncFromTZS = val => {
    setWizardTzs(val);
    const n = Number(val);
    if (!Number.isNaN(n) && n >= 0) setWizardUsdt(val ? (n / wizardEffectiveRate).toFixed(2) : ""); else setWizardUsdt("");
  };
  const wizardSyncFromUSDT = val => {
    setWizardUsdt(val);
    const n = Number(val);
    if (!Number.isNaN(n) && n >= 0) setWizardTzs(val ? String(Math.round(n * wizardEffectiveRate)) : ""); else setWizardTzs("");
  };

  // Paste functionality
  const wizardPasteInto = async setter => {
    try {
      const txt = await navigator.clipboard.readText();
      if (!txt) return alert("Nothing to paste");
      setter(txt);
    } catch (e) {
      alert("Paste not available");
    }
  };
  const wizardResetForward = from => {
    if (from <= 8) setWizardFiles([]);
    if (from <= 8) setWizardFinalSubmitted(false);
    if (from <= 6) {
      setWizardUserEmail("");
      setWizardUserUID("");
    }
    if (from <= 5) {
      setWizardPlatform("");
      setWizardP2pPlatform("");
    }
    if (from <= 4) {
      setWizardPayment("");
      setWizardSellAccMode("");
      setWizardSellAccName("");
      setWizardSellAccNumber("");
    }
    if (from <= 3) {
      setWizardUnit("");
      setWizardTzs("");
      setWizardUsdt("");
      setWizardAmtErr("");
    }
    if (from <= 2) setWizardRoute("");
    if (from <= 1) setWizardSide("");
  };
  const wizardCanNext = () => {
    // Step 1: require side selection
    if (wizardStep === 1) return !!wizardSide;
    // Step 2: require route selection
    if (wizardStep === 2) return !!wizardRoute;
    if (wizardRoute === "p2p" && wizardStep === 3) return !!wizardP2pPlatform; // platform must be chosen (we default to Binance)
    if (wizardRoute === "stay" && wizardStep === 3) {
      if (!WIZARD_RATE || WIZARD_RATE <= 0) return false;
      return wizardUnit === "TZS" ? !!wizardTzs && !wizardAmtErr : wizardUnit === "USDT" ? !!wizardUsdt && !wizardAmtErr : false;
    }
    // Step 5 (stay): require platform selection
    if (wizardRoute === "stay" && wizardStep === 5) return !!wizardPlatform;
    if (wizardStep === 4 && wizardSide === "Sell" && wizardRoute === "stay") {
      if (!wizardPayment) return false;
      if (wizardSellAccMode === "new") return !!wizardSellAccName && !!wizardSellAccNumber; // require entries then Next
      // saved mode: check if account details are populated
      if (wizardSellAccMode === "saved") {
        const savedAccounts = Array.isArray(wizardUserSavedAccounts[wizardPayment]) ? wizardUserSavedAccounts[wizardPayment] : [];
        if (savedAccounts.length > 0) {
          // Account details should be in wizardSellAccName and wizardSellAccNumber
          return !!wizardSellAccName && !!wizardSellAccNumber;
        }
        return false;
      }
      return false;
    }
    if (wizardStep === 6 && wizardSide === "Buy") return !!wizardUserEmail && !!wizardUserUID; // Buy needs email+uid; Sell step 6 is preview
    return true;
  };
  const wizardOnBack = () => {
    if (wizardStep === 1) return;
    const target = wizardStep - 1;
    wizardResetForward(target);
    setWizardStep(target);
  };
  const wizardOnNext = () => {
    // Strict authentication check - cannot proceed without login
    if (!authUser) {
      setAuthOpen(true);
      // Reset to step 1 if trying to advance without auth
      if (wizardStep >= 1) {
        setWizardStep(1);
        setWizardSide("");
      }
      return;
    }
    // EMAIL VERIFICATION DISABLED
    // Check email verification status
    // if (authUser && authUser.email_verified === false) {
    //   setToast({
    //     type: 'error',
    //     message: 'Please verify your email address before placing orders. Check your email for the verification link, or visit verify_email.html to resend it.'
    //   });
    //   return;
    // }
    if (!wizardCanNext()) return;
    setWizardStep(wizardStep + 1);
  };
  const wizardSubmit = async () => {
    console.log('wizardSubmit called', { authUser: !!authUser, isSubmitting, wizardFilesLength: wizardFiles?.length });

    if (!authUser) {
      setAuthOpen(true);
      return;
    }
    // EMAIL VERIFICATION DISABLED
    // Check email verification before submitting
    // if (authUser && authUser.email_verified === false) {
    //   setToast({
    //     type: 'error',
    //     message: 'Please verify your email address before placing orders. Check your email for the verification link.'
    //   });
    //   return;
    // }
    if (isSubmitting) {
      console.log('Already submitting, returning');
      return;
    }
    if (!wizardFiles || wizardFiles.length === 0) {
      alert('Please attach at least one payment proof image before submitting.');
      return;
    }

    // Check if window.submissions exists
    if (!window.submissions || !window.submissions.trackOrderSubmission) {
      console.error('window.submissions is not available');
      alert('Error: Submissions module not loaded. Please refresh the page and try again.');
      return;
    }
    // Set loading state immediately for instant visual feedback
    setIsSubmitting(true);
    // Use setTimeout to ensure React has time to update the UI
    await new Promise(resolve => setTimeout(resolve, 0));
    try {
      // Upload all files in parallel for faster processing
      const uploadPromises = wizardFiles.map(async (file, index) => {
        if (!(file instanceof File)) {
          throw new Error(`File ${index + 1} is not a valid File object`);
        }
        if (!file.name || file.size === 0) {
          throw new Error(`File ${index + 1} is invalid (name: ${file.name}, size: ${file.size})`);
        }
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await fetch('api/upload.php', {
          method: 'POST',
          body: fd
        });
        if (!uploadRes.ok) {
          const errorText = await uploadRes.text();
          throw new Error(`Upload failed with status ${uploadRes.status}: ${errorText}`);
        }
        const uploadJson = await uploadRes.json();
        if (uploadJson.success && uploadJson.url) {
          return uploadJson.url;
        } else {
          throw new Error(uploadJson.error || 'Upload failed');
        }
      });
      const receiptUrls = await Promise.all(uploadPromises);
      if (receiptUrls.length === 0) {
        alert('No receipts were uploaded successfully. Please try again.');
        setIsSubmitting(false);
        return;
      }
      try {
        console.log('Calling trackOrderSubmission with data:', {
          side: wizardSide,
          amount: wizardRoute === "stay" ? wizardUnit === "TZS" ? wizardTzs : wizardUsdt : wizardUsdt,
          currency: wizardUnit === "TZS" ? "TZS" : "USDT",
          platform: wizardRoute === "p2p" ? wizardP2pPlatform : wizardPlatform,
          receiptCount: receiptUrls.length
        });
        const submissionId = await window.submissions.trackOrderSubmission({
          side: wizardSide,
          amount: wizardRoute === "stay" ? wizardUnit === "TZS" ? wizardTzs : wizardUsdt : wizardUsdt,
          currency: wizardUnit === "TZS" ? "TZS" : "USDT",
          platform: wizardRoute === "p2p" ? wizardP2pPlatform : wizardPlatform,
          platformUid: wizardUserUID,
          platformEmail: wizardUserEmail,
          paymentMethod: wizardPayment,
          route: wizardRoute,
          name: authUser.name,
          email: authUser.email,
          phone: "N/A",
          receipts: receiptUrls,
          amountInput: wizardUnit === "TZS" ? wizardTzs : wizardUsdt,
          amountInputUnit: wizardUnit,
          amountUsdt: wizardSendUSDT,
          amountTzs: wizardPayTZS,
          payoutChannel: wizardSide === "Sell" ? wizardPayment : undefined,
          payoutName: wizardSide === "Sell" ? (wizardSellAccMode === "new" ? wizardSellAccName : wizardSellAccName) : undefined,
          payoutAccount: wizardSide === "Sell" ? (wizardSellAccMode === "new" ? wizardSellAccNumber : wizardSellAccNumber) : undefined,
          payoutAmount: wizardSide === "Sell" ? wizardUnit === "TZS" ? wizardPayTZS : wizardUsdt : undefined
        });
        if (submissionId) {
          window.submissions.showSuccessMessage(submissionId);
          setWizardFinalSubmitted(true);
          if (authUser && authUser.id) {
            setTimeout(() => fetchUserSubmissions(), 500);
            // Save payment account if user entered new details and checkbox is checked
            if (wizardSide === "Sell" && wizardSellAccMode === "new" && wizardPayment && wizardSellAccName && wizardSellAccNumber && wizardSaveAccount) {
              // Save account (will refresh saved accounts list automatically)
              savePaymentAccount(wizardPayment, wizardSellAccName, wizardSellAccNumber).catch(err => {
                console.error('Failed to save payment account:', err);
              });
            }
          }
          setWizardStep(1);
          setWizardSide("");
          setWizardRoute("");
          setWizardUnit("");
          setWizardTzs("");
          setWizardUsdt("");
          setWizardP2pPlatform("");
          setWizardPlatform("");
          setWizardPayment("");
          setWizardSellAccMode("");
          setWizardSellAccName("");
          setWizardSellAccNumber("");
          setWizardSaveAccount(true);
          setWizardSelectedSavedAccountId(null);
          setWizardFiles([]);
          setIsSubmitting(false);
        } else {
          throw new Error('Submission returned no ID');
        }
      } catch (submissionError) {
        console.error('Submission error:', submissionError);
        throw submissionError;
      }
    } catch (error) {
      console.error('Error submitting order:', error);
      console.error('Error stack:', error.stack);
      const errorMessage = error.message || 'Unknown error occurred';
      alert('Error submitting order: ' + errorMessage + '\n\nPlease check the browser console for more details.');
      setIsSubmitting(false);
    }
  };
  const savedAccountExists = wizardPayment ? (Array.isArray(wizardUserSavedAccounts[wizardPayment]) && wizardUserSavedAccounts[wizardPayment].length > 0) : false;
  // Only auto-advance for Buy or p2p routes - for Sell with saved accounts, show Next button
  const autoAdvanceStep4 = wizardStep === 4 && (wizardPayment && (wizardSide === "Buy" || wizardRoute === "p2p"));
  const autoAdvanceStep5 = wizardStep === 5 && wizardRoute === "stay";

  // Dynamic flag: which steps are select-only (hide Next)
  // Note: Sell with saved accounts should show Next button, not auto-advance
  const isWizardSelectStep = wizardStep === 1 || wizardStep === 2 || wizardRoute === "p2p" && wizardStep === 3 || autoAdvanceStep4 || autoAdvanceStep5;
  const copy = async text => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Account number copied ✅");
    } catch {
      setToast("Copy failed");
    }
    setTimeout(() => setToast(null), 1800);
  };

  // Professional toast notification function
  const showAuthToast = (message, type = 'warning') => {
    setAuthToast({
      message,
      type
    });
    setTimeout(() => setAuthToast(null), 4000);
  };
  const handleAuthContinue = async () => {
    if (!identifier || !secret) return;
    await wait(300);
    setOrderOpen(true); // auth mocked
  };
  const submitOrder = async () => {
    if (!order.name || !order.whatsapp || !order.amount) return;
    try {
      // Track the order submission
      const submissionId = await window.submissions.trackOrderSubmission({
        side: order.side || 'Buy',
        amount: order.amount,
        currency: order.currency || 'USDT',
        platform: order.platform || 'N/A',
        paymentMethod: 'N/A',
        route: 'stay',
        name: order.name,
        email: 'N/A',
        phone: order.whatsapp,
        amountInput: order.amount,
        amountInputUnit: order.currency || 'USDT'
      });
      if (submissionId) {
        window.submissions.showSuccessMessage(submissionId);
      }
    } catch (error) {
      console.error('Error tracking submission:', error);
    }
    await wait(400);
    const newId = `ORD-${Math.floor(Math.random() * 1_000_000).toString().padStart(6, "0")}`;
    setCreatedOrderId(newId);
    setOrderOpen(false);
    setPaymentOpen(true);
    setStatus("awaiting");
    setWizardFinalSubmitted(true);
  };
  const uploadReceipt = async () => {
    if (!receiptFile) {
      alert('Please attach an image first.');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('file', receiptFile);
      const up = await fetch('api/upload.php', {
        method: 'POST',
        body: fd
      });
      const upJson = await up.json();
      if (!upJson.success) throw new Error(upJson.error || 'Upload failed');
      const sessionId = window.analytics?.getSessionId?.() || localStorage.getItem('analytics_session_id') || 'session_' + Date.now();
      const proofData = {
        receipt_url: upJson.url,
        order_type: wizardSide || order.side || 'Buy',
        amount: wizardRoute === 'stay' ? wizardUnit === 'TZS' ? wizardTzs : wizardUsdt : order.amount || '',
        currency: 'USDT',
        platform: wizardRoute === 'p2p' ? wizardP2pPlatform : wizardPlatform || order.platform || '',
        payment_method: wizardPayment || 'N/A',
        route_type: wizardRoute || 'stay',
        related_order: createdOrderId || ''
      };

      // Create a submission record for the receipt
      await fetch('api/submissions.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          submission_type: 'payment_proof',
          form_data: proofData,
          user_info: {
            name: authUser?.name || 'User',
            email: authUser?.email || wizardUserEmail || 'N/A',
            phone: order.whatsapp || 'N/A'
          },
          status: 'pending'
        })
      });
      setStatus('received');
      setWizardFinalSubmitted(true);
      alert('Receipt uploaded successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to upload receipt: ' + e.message);
    }
  };

  /* TICKER */
  const [apiPrices, setApiPrices] = useState([]);
  const ADS = ["24/7 desk – instant confirmations", "Best spreads • Transparent rates", "Secure P2P • CRDB supported"];
  const cachedSnapshot = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem('live_usdt_snapshot');
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Failed to read cached live snapshot', error);
      return null;
    }
  }, []);

  /* LIVE P2P PRICES — Currently Offer */
  const [priceMode, setPriceMode] = useState('buy');
  const [lastUpdated, setLastUpdated] = useState(() => cachedSnapshot?.updatedAt ?? null);
  const [liveBuyRate, setLiveBuyRate] = useState(() => cachedSnapshot?.buyRate ?? null); // Buy price from buy link
  const [liveSellRate, setLiveSellRate] = useState(() => cachedSnapshot?.sellRate ?? null); // Sell price from sell link
  const [liveMinTzs, setLiveMinTzs] = useState(() => cachedSnapshot?.min ?? null); // Dynamic minimum limit (TZS)

  /* ORDER WIZARD RATE CONSTANTS */
  const rawBuyRate = toNumeric(liveBuyRate) ?? toNumeric(liveRate) ?? null;
  const rawSellRate = toNumeric(liveSellRate) ?? null;
  const WIZARD_BUY_RATE = rawBuyRate ?? 0;
  const WIZARD_SELL_RATE = rawSellRate ?? rawBuyRate ?? 0;
  const WIZARD_RATE = wizardSide === "Sell" ? WIZARD_SELL_RATE || WIZARD_BUY_RATE : WIZARD_BUY_RATE || WIZARD_SELL_RATE;
  const WIZARD_MIN_USDT = 1;
  const WIZARD_MAX_TZS = 5_000_000;
  const wizardRateFallback = Math.max(WIZARD_BUY_RATE, WIZARD_SELL_RATE, 0);
  const wizardEffectiveRate = WIZARD_RATE && WIZARD_RATE > 0 ? WIZARD_RATE : wizardRateFallback > 0 ? wizardRateFallback : 1;
  const WIZARD_MAX_USDT = Math.floor(WIZARD_MAX_TZS / wizardEffectiveRate);
  // Calculate minimum TZS amount after wizardEffectiveRate is defined
  // Round to ensure it's a whole number and ensure it's at least 1
  const wizardTzsMin = Math.max(1, Math.round(WIZARD_MIN_USDT * wizardEffectiveRate));
  const WIZARD_PAYMENT_METHODS = ["CRDB Bank", "NMB Bank", "M-Pesa", "Tigo Pesa", "Airtel Money"];
  const WIZARD_PLATFORMS = ["Binance", "Bitget", "BYBIT", "KuCoin", "OKX", "Remitano", "MEXC Exchange"];

  // Computed amounts (used in previews/finals) - must be after WIZARD_RATE is defined
  const wizardPayTZS = wizardUnit === "TZS" ? Number(wizardTzs || 0) : WIZARD_RATE > 0 ? Math.round(Number(wizardUsdt || 0) * WIZARD_RATE) : 0;
  const wizardSendUSDT = wizardUnit === "USDT" ? Number(wizardUsdt || 0) : WIZARD_RATE > 0 ? Number((Number(wizardTzs || 0) / WIZARD_RATE).toFixed(2)) : 0;
  const [liveMaxTzs, setLiveMaxTzs] = useState(() => cachedSnapshot?.max ?? null); // Dynamic maximum limit (TZS)
  const [liveSellMinTzs, setLiveSellMinTzs] = useState(() => cachedSnapshot?.sellMin ?? null);
  const [liveSellMaxTzs, setLiveSellMaxTzs] = useState(() => cachedSnapshot?.sellMax ?? null);
  const parseAmount = value => toNumeric(value);
  const formatPriceTzs = value => {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
    return `${Number(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} TZS`;
  };
  const formatRangeTzs = (min, max) => {
    if (min === null || min === undefined || max === null || max === undefined) return '—';
    return `${fmt(Math.round(min))} - ${fmt(Math.round(max))} TZS`;
  };
  const normalizePaymentKey = value => (value || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
  const PAYMENT_COLORS = {
    mpesa: "#00A859",
    mpesavodafone: "#00A859",
    tigopesa: "#002E7A",
    tigopesavodafone: "#002E7A",
    tigopesavodacom: "#002E7A",
    tigopesaairtel: "#002E7A",
    tigopesaairtelmoney: "#002E7A",
    airtelmoney: "#E41E26",
    crdbbank: "#007A3D",
    nmbbank: "#F58220"
  };
  const paymentColor = method => PAYMENT_COLORS[normalizePaymentKey(method)] || '#475569';
  const [liveBuyPayments, setLiveBuyPayments] = useState(() => Array.isArray(cachedSnapshot?.buyPayments) ? cachedSnapshot.buyPayments : []);
  const [liveSellPayments, setLiveSellPayments] = useState(() => Array.isArray(cachedSnapshot?.sellPayments) ? cachedSnapshot.sellPayments : []);
  const offerDetails = React.useMemo(() => {
    const buyUsdtLimit = formatRangeTzs(liveMinTzs, liveMaxTzs);
    const sellUsdtLimit = formatRangeTzs(liveSellMinTzs, liveSellMaxTzs);
    return {
      buy: [{
        asset: "USDT",
        price: formatPriceTzs(liveBuyRate),
        limit: buyUsdtLimit,
        payments: liveBuyPayments.length ? liveBuyPayments : ["M-Pesa", "TigoPesa", "AirtelMoney"]
      }, {
        asset: "BTC",
        price: "170,000,000.00 TZS",
        limit: "6,900 - 2,763,017 TZS",
        payments: ["CRDB Bank", "NMB Bank"]
      }, {
        asset: "ETH",
        price: "10,000,000.00 TZS",
        limit: "6,900 - 2,763,017 TZS",
        payments: ["M-Pesa", "CRDB Bank", "NMB Bank"]
      }],
      sell: [{
        asset: "USDT",
        price: formatPriceTzs(liveSellRate),
        limit: sellUsdtLimit,
        payments: liveSellPayments.length ? liveSellPayments : ["CRDB Bank", "NMB Bank", "M-Pesa"]
      }, {
        asset: "BTC",
        price: "168,000,000.00 TZS",
        limit: sellUsdtLimit,
        payments: ["CRDB Bank", "M-Pesa", "AirtelMoney"]
      }, {
        asset: "ETH",
        price: "9,800,000.00 TZS",
        limit: sellUsdtLimit,
        payments: ["NMB Bank", "M-Pesa", "TigoPesa"]
      }]
    };
  }, [liveBuyRate, liveSellRate, liveMinTzs, liveMaxTzs, liveSellMinTzs, liveSellMaxTzs, liveBuyPayments, liveSellPayments]);
  const currentPaymentMethods = React.useMemo(() => {
    const usdtRow = offerDetails[priceMode]?.find(row => row.asset === "USDT");
    return usdtRow?.payments ?? [];
  }, [offerDetails, priceMode]);
  const handleAdvancementClick = () => {
    window.location.href = "/advertisements";
  };
  const scrollToOrderWizard = () => {
    // Check if user is logged in
    if (!authUser) {
      setAuthOpen(true);
      return;
    }
    // EMAIL VERIFICATION DISABLED
    // Check if email is verified - BLOCK if not verified
    // if (authUser && authUser.email_verified === false) {
    //   setToast({
    //     type: 'error',
    //     message: 'Please verify your email address before placing orders. Check your email for the verification link, or visit verify_email.html to resend it.'
    //   });
    //   setTimeout(() => {
    //     window.location.href = 'verify_email.html';
    //   }, 2000);
    //   return;
    // }
    // User is verified, proceed with scrolling to wizard
    const orderWizardSection = document.getElementById('contact');
    if (!orderWizardSection) return;
    orderWizardSection.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
    setTimeout(() => {
      const dropdown = orderWizardSection.querySelector('select');
      if (dropdown) {
        dropdown.focus();
        dropdown.click();
        dropdown.dispatchEvent(new Event('mousedown', {
          bubbles: true
        }));
      }
    }, 500);
  };
  const openQuickOrder = side => {
    // Check if user is logged in
    if (!authUser) {
      setAuthOpen(true);
      return;
    }
    // EMAIL VERIFICATION DISABLED
    // Check if email is verified - BLOCK if not verified
    // if (authUser && authUser.email_verified === false) {
    //   setToast({
    //     type: 'error',
    //     message: 'Please verify your email address before placing orders. Check your email for the verification link, or visit verify_email.html to resend it.'
    //   });
    //   // Optionally redirect to verification page
    //   setTimeout(() => {
    //     window.location.href = 'verify_email.html';
    //   }, 2000);
    //   return;
    // }
    // User is verified, proceed with opening wizard
    wizardResetForward(1);
    setWizardStep(1);
    // Only set side if provided, otherwise let user select in step 1
    if (side) {
      setWizardSide(side);
    } else {
      setWizardSide("");
    }
    setQuickOrderOpen(true);
  };
  const closeQuickOrder = () => {
    setQuickOrderOpen(false);
    // Reset wizard to step 1 when closed to ensure it starts fresh next time
    setWizardStep(1);
    wizardResetForward(1);
  };
  useEffect(() => {
    let cancelled = false;
    let currentBuyCode = 'j15stHvu1u4';
    let currentSellCode = 'HrOzHzvC5uj';
    async function loadCodes() {
      try {
        const res = await fetch('api/p2p_config.php', {
          cache: 'no-store'
        });
        const j = await res.json();
        if (j?.success && j?.data) {
          currentBuyCode = j.data.buyCode || currentBuyCode;
          currentSellCode = j.data.sellCode || currentSellCode;
        }
      } catch { }
    }
    async function refreshUsdt() {
      try {
        // Fetch buy price from configured link
        const buyRes = await fetch(`api/binance_price.php?code=${encodeURIComponent(currentBuyCode)}`, {
          cache: 'no-store'
        });
        const buyData = await buyRes.json();

        // Fetch sell price from configured link
        const sellRes = await fetch(`api/binance_price.php?code=${encodeURIComponent(currentSellCode)}`, {
          cache: 'no-store'
        });
        const sellData = await sellRes.json();
        if (!cancelled) {
          const buyPrice = buyData?.success && buyData?.price !== undefined ? Number(buyData.price) : null;
          const sellPrice = sellData?.success && sellData?.price !== undefined ? Number(sellData.price) : null;
          const buyMin = parseAmount(buyData?.minAmount);
          const buyMax = parseAmount(buyData?.maxAmount);
          const buyAvailable = parseAmount(buyData?.availableFiat);
          const sellMin = parseAmount(sellData?.minAmount);
          const sellMax = parseAmount(sellData?.maxAmount);
          const sellAvailable = parseAmount(sellData?.availableFiat);
          const buyMaxCandidates = [buyAvailable, buyMax].filter(v => typeof v === 'number' && v > 0);
          const sellMaxCandidates = [sellAvailable, sellMax].filter(v => typeof v === 'number' && v > 0);
          const nextBuyMinTzs = buyMin ?? liveMinTzs;
          const nextBuyMaxTzs = buyMaxCandidates.length ? Math.min(...buyMaxCandidates) : liveMaxTzs;
          const nextSellMinTzs = sellMin ?? liveSellMinTzs;
          const nextSellMaxTzs = sellMaxCandidates.length ? Math.min(...sellMaxCandidates) : liveSellMaxTzs;
          const nextBuyPayments = Array.isArray(buyData?.paymentMethods) ? buyData.paymentMethods : [];
          const nextSellPayments = Array.isArray(sellData?.paymentMethods) ? sellData.paymentMethods : [];
          if (buyPrice !== null) setLiveBuyRate(buyPrice);
          if (sellPrice !== null) setLiveSellRate(sellPrice);
          if (nextBuyMinTzs !== null) setLiveMinTzs(nextBuyMinTzs);
          if (nextBuyMaxTzs !== null) setLiveMaxTzs(nextBuyMaxTzs);
          if (nextSellMinTzs !== null) setLiveSellMinTzs(nextSellMinTzs);
          if (nextSellMaxTzs !== null) setLiveSellMaxTzs(nextSellMaxTzs);
          if (nextBuyPayments.length) setLiveBuyPayments(nextBuyPayments);
          if (nextSellPayments.length) setLiveSellPayments(nextSellPayments);
          const nextBuyRate = buyPrice ?? liveBuyRate;
          const nextSellRate = sellPrice ?? liveSellRate;
          const timestamp = Date.now();
          if (buyPrice !== null) setLiveRate(buyPrice);
          setLastUpdated(timestamp);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem('live_usdt_snapshot', JSON.stringify({
                buyRate: nextBuyRate,
                sellRate: nextSellRate,
                min: nextBuyMinTzs,
                max: nextBuyMaxTzs,
                sellMin: nextSellMinTzs,
                sellMax: nextSellMaxTzs,
                buyPayments: nextBuyPayments,
                sellPayments: nextSellPayments,
                updatedAt: timestamp
              }));
            } catch (error) {
              console.warn('Failed to store live snapshot', error);
            }
          }
        }
      } catch (e) {
        // ignore errors; keep last known prices
        console.error('Error fetching live prices:', e);
      }
    }
    // Defer initial fetch to allow UI to render first
    setTimeout(async () => {
      if (!cancelled) {
        await loadCodes();
        await refreshUsdt();
      }
    }, 200);
    const id = setInterval(async () => {
      await loadCodes();
      await refreshUsdt();
    }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Update ticker prices when live rates change
  useEffect(() => {
    const now = new Date().toISOString();
    const next = [];
    if (liveBuyRate !== null) {
      next.push({
        asset: "USDT",
        side: "buy",
        rate_tzs: liveBuyRate,
        updated_at: now
      });
    }
    if (liveSellRate !== null) {
      next.push({
        asset: "USDT",
        side: "sell",
        rate_tzs: liveSellRate,
        updated_at: now
      });
    }
    setApiPrices(next);
  }, [liveBuyRate, liveSellRate]);

  /* ORDER WIZARD AUTO-ADVANCE EFFECTS */
  useEffect(() => {
    if (wizardStep === 1 && wizardSide) {
      if (!authUser) {
        setAuthOpen(true);
        // Reset wizardSide to prevent auto-advance
        setWizardSide("");
        return;
      }
      // Only advance if validation passes
      if (wizardCanNext()) {
        trackWizardStep(1, wizardSide);
        setTimeout(() => setWizardStep(2), 120);
      }
    }
  }, [wizardStep, wizardSide, authUser]);
  useEffect(() => {
    // Block access to step 2+ without authentication
    if (wizardStep >= 2 && !authUser) {
      setAuthOpen(true);
      setWizardStep(1);
      setWizardSide("");
      return;
    }
    if (wizardStep === 2 && wizardRoute) {
      if (!authUser) {
        setAuthOpen(true);
        setWizardStep(1);
        setWizardSide("");
        return;
      }
      // Only advance if validation passes
      if (wizardCanNext()) {
        trackWizardStep(2, wizardSide, null, wizardRoute);
        setTimeout(() => setWizardStep(3), 120);
      }
    }
  }, [wizardStep, wizardRoute, authUser]);

  // Remove auto-focus effects - they were causing cursor issues

  useEffect(() => {
    if (wizardStep !== 4) return;
    let timer;
    // Only auto-advance for Buy or p2p routes - Sell orders should require manual Next click
    const shouldAutoAdvance = wizardPayment && (wizardSide === "Buy" || wizardRoute === "p2p");
    // Only advance if validation passes
    if (shouldAutoAdvance && wizardCanNext()) {
      timer = setTimeout(() => {
        setWizardStep(prev => prev === 4 ? prev + 1 : prev);
      }, 160);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [wizardStep, wizardSide, wizardRoute, wizardPayment]);
  useEffect(() => {
    if (wizardStep !== 5 || wizardRoute !== "stay" || !wizardPlatform) return;
    // Only advance if validation passes
    if (wizardCanNext()) {
      const timer = setTimeout(() => {
        setWizardStep(prev => prev === 5 ? prev + 1 : prev);
      }, 160);
      return () => clearTimeout(timer);
    }
  }, [wizardStep, wizardRoute, wizardPlatform]);
  useEffect(() => {
    if (!wizardFinalSubmitted) return;
    const timer = setTimeout(() => setWizardFinalSubmitted(false), 4000);
    return () => clearTimeout(timer);
  }, [wizardFinalSubmitted]);

  // Lock body scroll when wizard is open
  useEffect(() => {
    if (quickOrderOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [quickOrderOpen]);

  // Fetch user submissions when logged in
  const fetchUserSubmissions = async () => {
    if (!authUser || !authUser.id) return;
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`api/submissions.php?action=user_submissions&user_id=${authUser.id}&limit=50`);
      const data = await res.json();
      if (data.success) {
        setUserSubmissions(data.submissions || []);
      }
    } catch (e) {
      console.error('Error fetching submissions:', e);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  // Fetch saved payment accounts for the user
  const fetchSavedAccounts = async () => {
    if (!authUser || !authUser.id) return;
    try {
      const res = await fetch(`api/payment_accounts.php?action=get&user_id=${authUser.id}`);
      const data = await res.json();
      if (data.success && data.accounts) {
        setWizardUserSavedAccounts(data.accounts);
      }
    } catch (e) {
      console.error('Error fetching saved accounts:', e);
    }
  };

  // Save payment account for the user
  const savePaymentAccount = async (paymentMethod, accountName, accountNumber) => {
    if (!authUser || !authUser.id) return;
    if (!paymentMethod || !accountName || !accountNumber) return;

    try {
      const res = await fetch('api/payment_accounts.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          user_id: authUser.id,
          payment_method: paymentMethod,
          account_name: accountName,
          account_number: accountNumber
        })
      });
      const data = await res.json();
      if (data.success) {
        // Refresh saved accounts from server to ensure consistency
        await fetchSavedAccounts();
        return true;
      }
    } catch (e) {
      console.error('Error saving account:', e);
    }
    return false;
  };
  useEffect(() => {
    if (authUser && authUser.id) {
      fetchUserSubmissions();
      fetchSavedAccounts();
      // Initialize profile form with user data
      setProfileForm({
        name: authUser.name || '',
        email: authUser.email || ''
      });
      // Set profile picture if available
      if (authUser.profile_picture) {
        setProfilePicture(authUser.profile_picture);
      }
    } else {
      setUserSubmissions([]);
      setWizardUserSavedAccounts({});
    }
  }, [authUser]);

  // Route === p2p: keep user on Step 3 with embedded market; require explicit exchange selection.
  // No auto-default, user must choose from the dropdown.

  // Fetch saved accounts when reaching step 4 (if logged in)
  useEffect(() => {
    if (wizardStep === 4 && authUser && authUser.id) {
      fetchSavedAccounts();
    }
  }, [wizardStep]);

  // Disable all auto-advance behavior; require explicit Next.
  // Prefill from saved accounts without changing the step.
  useEffect(() => {
    if (wizardStep === 4 && wizardPayment && wizardSide === "Sell" && wizardRoute === "stay") {
      const savedAccounts = wizardUserSavedAccounts[wizardPayment];
      const hasSaved = savedAccounts && Array.isArray(savedAccounts) && savedAccounts.length > 0;

      // Auto-select "saved" mode if a saved account exists and no mode is selected yet
      if (!wizardSellAccMode && hasSaved) {
        setWizardSellAccMode("saved");
        // Auto-select the first (most recent) saved account
        if (savedAccounts[0]) {
          const firstAccount = savedAccounts[0];
          setWizardSelectedSavedAccountId(firstAccount.id);
          setWizardSellAccName(firstAccount.name || "");
          setWizardSellAccNumber(firstAccount.number || "");
        }
      }

      // If mode is already "saved" but no account is selected, select the first one
      if (wizardSellAccMode === "saved" && hasSaved && !wizardSelectedSavedAccountId && savedAccounts[0]) {
        const firstAccount = savedAccounts[0];
        setWizardSelectedSavedAccountId(firstAccount.id);
        setWizardSellAccName(firstAccount.name || "");
        setWizardSellAccNumber(firstAccount.number || "");
      }

      // Update fields when selected account changes
      if (wizardSellAccMode === "saved" && hasSaved && wizardSelectedSavedAccountId) {
        const selectedAccount = savedAccounts.find(acc => acc.id === wizardSelectedSavedAccountId);
        if (selectedAccount) {
          setWizardSellAccName(selectedAccount.name || "");
          setWizardSellAccNumber(selectedAccount.number || "");
        }
      }
    }
  }, [wizardStep, wizardPayment, wizardSide, wizardRoute, wizardSellAccMode, wizardUserSavedAccounts, wizardSelectedSavedAccountId]);

  /* ORDER WIZARD AMOUNT VALIDATION */
  useEffect(() => {
    if (wizardRoute !== "stay") {
      setWizardAmtErr("");
      return;
    }
    let err = "";
    if (wizardUnit === "TZS") {
      const n = Number(wizardTzs);
      if (!n) err = "Enter TZS amount"; else if (n < wizardTzsMin) err = `Minimum is ${fmt(wizardTzsMin)}/=`; else if (n > WIZARD_MAX_TZS) err = `Maximum is ${fmt(WIZARD_MAX_TZS)}/=`;
    } else if (wizardUnit === "USDT") {
      const n = Number(wizardUsdt);
      if (!n) err = "Enter USDT amount"; else if (n < WIZARD_MIN_USDT) err = `Minimum is ${fmt(WIZARD_MIN_USDT)} USDT`; else if (n > WIZARD_MAX_USDT) err = `Maximum is ${fmt(WIZARD_MAX_USDT)} USDT`;
    } else if (wizardStep === 3) {
      err = "Select Amount Unit";
    }
    setWizardAmtErr(err);
  }, [wizardRoute, wizardUnit, wizardTzs, wizardUsdt, wizardStep]);
  const ago = t => {
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    return s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
  };

  /* ============ RENDER ============ */
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen text-white",
    style: {
      background: "linear-gradient(180deg,#0f172a 0%, #0b1225 100%)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-black/60 text-white/80 border-b border-white/5 sticky top-0 z-[60]"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full mx-auto px-2 sm:px-4 h-8 sm:h-9 flex items-center gap-2 sm:gap-6 overflow-hidden"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-1 whitespace-nowrap"
  }, /*#__PURE__*/React.createElement("marquee", {
    behavior: "scroll",
    direction: "left",
    scrollamount: "3",
    className: "text-xs sm:text-sm"
  }, apiPrices.slice(0, 2).map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "mr-6 sm:mr-10"
  }, p.asset, " ", p.side.toUpperCase(), ": ", fmt(p.rate_tzs), " TZS \u2022 Updated", " ", new Date(p.updated_at).toLocaleTimeString())))), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block whitespace-nowrap"
  }, /*#__PURE__*/React.createElement("marquee", {
    behavior: "scroll",
    direction: "right",
    scrollamount: "3"
  }, ADS.map((a, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: "ml-10"
  }, a)))))), /*#__PURE__*/React.createElement("header", {
    className: "sticky top-9 z-50 bg-black text-white border-b border-white/10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#top",
    className: "flex items-center gap-1.5 sm:gap-2 min-w-0"
  }, /*#__PURE__*/React.createElement(Logo, null), /*#__PURE__*/React.createElement("span", {
    className: "font-semibold text-sm sm:text-base truncate"
  }, BUSINESS_NAME)), /*#__PURE__*/React.createElement("nav", {
    className: "hidden md:flex items-center gap-6 text-sm text-white/80"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#prices",
    className: "hover:text-white"
  }, "Prices"), /*#__PURE__*/React.createElement("a", {
    href: "#about",
    className: "hover:text-white"
  }, "About"), /*#__PURE__*/React.createElement("a", {
    href: "#how",
    className: "hover:text-white"
  }, "How It Works"), /*#__PURE__*/React.createElement("a", {
    href: "#why",
    className: "hover:text-white"
  }, "Why Us"), /*#__PURE__*/React.createElement("a", {
    href: "#contact",
    className: "hover:text-white"
  }, "Contact")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block"
  }, /*#__PURE__*/React.createElement(Button, {
    as: "a",
    href: "#prices"
  }, "View Prices")), authUser ? /*#__PURE__*/React.createElement("div", {
    className: "hidden md:flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowUserDashboard(true),
    className: "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 transition",
    title: "View my orders"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
  })), /*#__PURE__*/React.createElement("span", null, authUser.name)), /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      try {
        await fetch('api/auth.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'logout'
          })
        });
        localStorage.removeItem('authUser');
        setAuthUser(null);
        setUserSubmissions([]);
        setShowUserDashboard(false);
      } catch (e) {
        console.error('Logout error:', e);
        // Still clear local state
        localStorage.removeItem('authUser');
        setAuthUser(null);
        setUserSubmissions([]);
        setShowUserDashboard(false);
      }
    },
    className: "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 transition",
    title: "Logout"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
  })), "Logout")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setAuthOpen(true),
    className: "hidden md:inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium border border-white/10 bg-white/5 hover:bg-white/10 transition"
  }, "Login"), authUser ? /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowUserDashboard(true),
    className: "p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition",
    title: "My Account"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5 sm:w-6 sm:h-6",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
  }))) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setAuthOpen(true),
    className: "md:hidden p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition",
    title: "Login"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
  })))))), quickOrderOpen && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[120] flex items-center justify-center bg-black/20 backdrop-blur-md px-4 py-8 overflow-hidden",
    onTouchMove: e => {
      // Only prevent if touching the backdrop, not the modal content
      if (e.target === e.currentTarget) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    onWheel: e => {
      // Only prevent if scrolling the backdrop, not the modal content
      if (e.target === e.currentTarget) {
        e.stopPropagation();
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-3xl relative max-h-[90vh] overflow-y-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative",
    style: {
      border: "1px solid #202636",
      borderRadius: "24px",
      background: "linear-gradient(180deg,#0f1115 0%, #0b0c10 60%)",
      padding: "32px",
      boxShadow: "0 0 0 1px #202636, 0 18px 40px rgba(0,0,0,.5)",
      opacity: "1"
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: closeQuickOrder,
    className: "absolute top-3 right-3 w-9 h-9 rounded-full bg-black/70 text-white text-xl leading-none flex items-center justify-center border border-white/20 hover:bg-black/80 z-10",
    "aria-label": "Close quick order"
  }, "\xD7"), wizardSide && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-4 right-16 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-white",
    style: {
      background: wizardSide === "Buy" ? "#065f46" : "#7f1d1d"
    }
  }, wizardSide.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "text-center text-3xl font-black mb-2",
    style: {
      color: "#ffffff"
    }
  }, "jordanmwinukatz"), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-center mb-2",
    style: {
      color: "#fbbf24"
    }
  }, "Start Your Order"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm opacity-85 text-center mb-4"
  }, "Step ", wizardStep, " of ", wizardStepCount), false && authUser && authUser.email_verified === false && /*#__PURE__*/React.createElement("div", { // EMAIL VERIFICATION DISABLED
    className: "mb-6 p-5 rounded-2xl border-4 border-red-500 bg-gradient-to-r from-red-900/40 via-red-800/30 to-red-900/40 text-white text-center shadow-2xl animate-pulse"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-12 h-12 mx-auto text-red-400",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
  }))), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold mb-2 text-red-100"
  }, "🚫 EMAIL VERIFICATION REQUIRED"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mb-3 text-red-50 font-medium"
  }, "You must verify your email address before you can place orders."), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mb-4 text-red-100"
  }, "Check your email inbox for the verification link, or click the button below to resend it."), /*#__PURE__*/React.createElement("a", {
    href: "verify_email.html",
    className: "inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-slate-900 font-bold text-sm hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
  }, "✓ Verify Email Now")), false && authUser && authUser.email_verified === false && /*#__PURE__*/React.createElement("div", { // EMAIL VERIFICATION DISABLED
    className: "mb-6 p-4 rounded-xl border-2 border-red-400 bg-red-950/50 backdrop-blur-sm text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-100 text-sm font-semibold mb-1"
  }, "⚠️ The order wizard is completely disabled until your email is verified."), /*#__PURE__*/React.createElement("p", {
    className: "text-red-200 text-xs"
  }, "All order functions will remain locked until verification is complete.")), wizardFinalSubmitted && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 px-4 py-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 text-sm font-semibold text-center shadow-lg"
  }, "Order submitted successfully. Our team will reach out shortly."), wizardStep === 1 && /*#__PURE__*/React.createElement("select", {
    value: wizardSide,
    onChange: e => {
      if (!authUser) {
        setWizardSide(e.target.value);
        setAuthOpen(true);
        return;
      }
      // EMAIL VERIFICATION DISABLED
      // Block if email not verified
      // if (authUser && authUser.email_verified === false) {
      //   setToast({
      //     type: 'error',
      //     message: 'Please verify your email address before placing orders. Redirecting to verification page...'
      //   });
      //   setTimeout(() => {
      //     window.location.href = 'verify_email.html';
      //   }, 1500);
      //   return;
      // }
      setWizardSide(e.target.value);
    },
    disabled: false, // EMAIL VERIFICATION DISABLED: authUser && authUser.email_verified === false,
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Action"), /*#__PURE__*/React.createElement("option", {
    value: "Buy"
  }, "Buy"), /*#__PURE__*/React.createElement("option", {
    value: "Sell"
  }, "Sell")), wizardStep === 2 && /*#__PURE__*/React.createElement("select", {
    value: wizardRoute,
    onChange: e => setWizardRoute(e.target.value),
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Trade Route"), /*#__PURE__*/React.createElement("option", {
    value: "stay"
  }, "Stay Here"), /*#__PURE__*/React.createElement("option", {
    value: "p2p"
  }, "Open P2P Market Inside")), wizardStep === 3 && wizardRoute === "stay" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm mb-2"
  }, "Rate: 1 USDT = ", fmt(WIZARD_RATE), "/="), /*#__PURE__*/React.createElement("select", {
    value: wizardUnit,
    onChange: e => {
      setWizardUnit(e.target.value);
      setWizardTzs("");
      setWizardUsdt("");
      setWizardAmtErr("");
    },
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Amount Unit"), /*#__PURE__*/React.createElement("option", {
    value: "TZS"
  }, "TZS"), /*#__PURE__*/React.createElement("option", {
    value: "USDT"
  }, "USDT")), wizardUnit === "TZS" && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    ref: wizardTzsInputRef,
    type: "number",
    inputMode: "numeric",
    placeholder: `Enter amount (min ${fmt(wizardTzsMin) || '1'}/=, max ${fmt(WIZARD_MAX_TZS)}/=`,
    value: wizardTzs,
    onChange: e => wizardSyncFromTZS(e.target.value),
    className: "flex-1 p-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardTzs)
  }, "Paste")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-sm"
  }, wizardSide === "Sell" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Amount you send: ", /*#__PURE__*/React.createElement("b", null, fmt(wizardUsdt)), " USDT") : /*#__PURE__*/React.createElement(React.Fragment, null, "Amount you receive: ", /*#__PURE__*/React.createElement("b", null, fmt(wizardUsdt)), " USDT")), !!wizardAmtErr && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 text-red-400 text-xs"
  }, wizardAmtErr)), wizardUnit === "USDT" && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    ref: wizardUsdtInputRef,
    type: "number",
    inputMode: "decimal",
    placeholder: `Enter amount (min ${fmt(WIZARD_MIN_USDT)} USDT, max ${fmt(WIZARD_MAX_USDT)} USDT)`,
    value: wizardUsdt,
    onChange: e => wizardSyncFromUSDT(e.target.value),
    className: "flex-1 p-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardUsdt)
  }, "Paste")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-sm"
  }, wizardSide === "Sell" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Amount you receive: ", /*#__PURE__*/React.createElement("b", null, fmt(wizardTzs)), "/=") : /*#__PURE__*/React.createElement(React.Fragment, null, "Amount you pay: ", /*#__PURE__*/React.createElement("b", null, fmt(wizardTzs)), "/=")), !!wizardAmtErr && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 text-red-400 text-xs"
  }, wizardAmtErr))), wizardStep === 3 && wizardRoute === "p2p" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm mb-2"
  }, "Choose exchange to browse P2P offers inside this page."), /*#__PURE__*/React.createElement("select", {
    value: wizardP2pPlatform,
    onChange: e => {
      setWizardP2pPlatform(e.target.value);
      setWizardPlatform(e.target.value);
      if (e.target.value) {
        trackButtonClick('p2p_market_auto_open', 'wizard_step_3');
        window.open(WIZARD_P2P_URLS(wizardSide, e.target.value), '_blank', 'noopener,noreferrer');
      }
    },
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Exchange"), WIZARD_PLATFORMS.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p)))), wizardStep === 4 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("select", {
    value: wizardPayment,
    onChange: e => {
      const selectedPayment = e.target.value;
      setWizardPayment(selectedPayment);
      setWizardSellAccMode(""); // Reset mode - useEffect will auto-select "saved" if available
      // Auto-advance will be handled by useEffect if validation passes
    },
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Payment Method"), WIZARD_PAYMENT_METHODS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, m))), wizardSide === "Sell" && wizardRoute === "stay" && wizardPayment && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 font-bold"
  }, "Provide your payment method"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setWizardSellAccMode("saved");
      // Auto-advance will be handled by useEffect if validation passes
    },
    className: `px-4 py-2 rounded-lg border-none text-white cursor-pointer ${wizardSellAccMode === "saved" ? "bg-green-700" : "bg-gray-600"}`
  }, "Use Saved Account"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setWizardSellAccMode("new"),
    className: `px-4 py-2 rounded-lg border-none text-white cursor-pointer ${wizardSellAccMode === "new" ? "bg-blue-600" : "bg-gray-600"}`
  }, "Enter New Account")), wizardSellAccMode === "saved" && (() => {
    const savedAccounts = Array.isArray(wizardUserSavedAccounts[wizardPayment]) ? wizardUserSavedAccounts[wizardPayment] : [];
    const hasMultiple = savedAccounts.length > 1;
    const selectedAccount = savedAccounts.find(acc => acc.id === wizardSelectedSavedAccountId) || savedAccounts[0];

    return /*#__PURE__*/React.createElement("div", {
      className: "mt-3"
    }, hasMultiple && /*#__PURE__*/React.createElement("div", {
      className: "mb-4"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-bold mb-2"
    }, "Select Saved Account:"), /*#__PURE__*/React.createElement("select", {
      value: wizardSelectedSavedAccountId || "",
      onChange: e => {
        const accountId = parseInt(e.target.value);
        setWizardSelectedSavedAccountId(accountId);
        const acc = savedAccounts.find(a => a.id === accountId);
        if (acc) {
          setWizardSellAccName(acc.name || "");
          setWizardSellAccNumber(acc.number || "");
        }
      },
      className: "block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    }, savedAccounts.map((acc, index) => /*#__PURE__*/React.createElement("option", {
      key: acc.id,
      value: acc.id
    }, savedAccounts.length > 1 ? `Account ${index + 1}: ${acc.name} - ${acc.number}` : `${acc.name} - ${acc.number}`)))), /*#__PURE__*/React.createElement("div", {
      className: "mb-4"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-bold mb-2"
    }, "Account Name:"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      className: "block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
      placeholder: "Not set",
      value: selectedAccount?.name || "",
      readOnly: true
    })), /*#__PURE__*/React.createElement("div", {
      className: "mb-4"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-bold mb-2"
    }, "Account / Wallet Number:"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      className: "block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
      placeholder: "Not set",
      value: selectedAccount?.number || "",
      readOnly: true
    })), selectedAccount ? /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-xs opacity-80"
    }, "Account ready. Click \"Next\" to continue.") : /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-xs text-yellow-500"
    }, "No saved details for this method. Please choose \"Enter New Account\"."));
  })(), wizardSellAccMode === "new" && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center mb-2"
  }, /*#__PURE__*/React.createElement("input", {
    className: "flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white",
    placeholder: "Account Holder Name",
    value: wizardSellAccName,
    onChange: e => setWizardSellAccName(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardSellAccName)
  }, "Paste")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    className: "flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white",
    placeholder: "Account / Wallet Number",
    value: wizardSellAccNumber,
    onChange: e => setWizardSellAccNumber(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardSellAccNumber)
  }, "Paste")), authUser && authUser.id && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: "save-account-checkbox",
    checked: wizardSaveAccount,
    onChange: e => setWizardSaveAccount(e.target.checked),
    className: "w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "save-account-checkbox",
    className: "text-sm text-white/80 cursor-pointer"
  }, "Save this account for future use"))))), wizardStep === 5 && wizardRoute === "stay" && /*#__PURE__*/React.createElement("select", {
    value: wizardPlatform,
    onChange: e => {
      const selectedPlatform = e.target.value;
      setWizardPlatform(selectedPlatform);
      // Auto-advance will be handled by useEffect if validation passes
    },
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Platform"), WIZARD_PLATFORMS.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p))), wizardStep === 6 && (wizardSide === "Sell" ? /*#__PURE__*/React.createElement("div", {
    className: "border border-gray-700 rounded-xl p-3.5 bg-black/40"
  }, /*#__PURE__*/React.createElement("b", null, "Preview"), /*#__PURE__*/React.createElement("div", null, "Payment Method: ", wizardPayment || "-"), /*#__PURE__*/React.createElement("div", null, "Account Name: ", wizardSellAccName || "-"), /*#__PURE__*/React.createElement("div", null, "Account No.: ", wizardSellAccNumber || "-"), /*#__PURE__*/React.createElement("div", null, "Exchange: ", wizardRoute === "p2p" ? wizardP2pPlatform || "-" : wizardPlatform || "-"), /*#__PURE__*/React.createElement("div", null, wizardRoute === "stay" ? `Amount you send: ${fmtUsd(wizardSendUSDT)} USDT` : "—"), wizardRoute === "stay" && /*#__PURE__*/React.createElement("div", null, `Amount you receive: ${fmt(wizardPayTZS)} TZS`)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center mb-2"
  }, /*#__PURE__*/React.createElement("input", {
    ref: wizardEmailRef,
    className: "flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white",
    placeholder: "Exchange Email Address",
    value: wizardUserEmail,
    onChange: e => setWizardUserEmail(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardUserEmail)
  }, "Paste")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    ref: wizardUidRef,
    className: "flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white",
    placeholder: "Exchange UID",
    value: wizardUserUID,
    onChange: e => setWizardUserUID(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardUserUID)
  }, "Paste")))), wizardStep === 7 && wizardSide === "Buy" && /*#__PURE__*/React.createElement("div", {
    className: "border border-gray-700 rounded-xl p-3.5 bg-black/40"
  }, /*#__PURE__*/React.createElement("b", null, "Preview"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, "Payment Method: ", wizardPayment || "-"), /*#__PURE__*/React.createElement("div", null, "Platform: ", wizardRoute === "p2p" ? wizardP2pPlatform || "-" : wizardPlatform || "-"), /*#__PURE__*/React.createElement("div", null, "Email: ", wizardUserEmail || "-"), /*#__PURE__*/React.createElement("div", null, "UID: ", wizardUserUID || "-"), /*#__PURE__*/React.createElement("div", null, wizardRoute === "stay" ? `Amount you pay: ${fmt(wizardUnit === "TZS" ? wizardTzs : wizardPayTZS)} TZS` : "—"), /*#__PURE__*/React.createElement("div", null, `Amount you receive: ${fmtUsd(wizardSendUSDT)} USDT`)), wizardStep === 7 && wizardSide === "Sell" && /*#__PURE__*/React.createElement("div", {
    className: "border border-gray-700 rounded-xl p-3.5 bg-black/40"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mt-0 text-yellow-400"
  }, "Send USDT by internal transfer only. Use the details below."), (() => {
    const acc = wizardRoute === "p2p" ? WIZARD_SELL_RECEIVE_MAP[wizardP2pPlatform] : WIZARD_SELL_RECEIVE_MAP[wizardPlatform];
    if (!acc) return /*#__PURE__*/React.createElement("div", {
      className: "opacity-80"
    }, "Select a platform to view recipient details.");
    return /*#__PURE__*/React.createElement(React.Fragment, null, acc.username ? /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold mb-2"
    }, "Recipient Username: ", acc.username, /*#__PURE__*/React.createElement("button", {
      className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
      onClick: () => copy(acc.username)
    }, "Copy")) : null, /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold mb-2"
    }, "Recipient Email: ", acc.email, /*#__PURE__*/React.createElement("button", {
      className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
      onClick: () => copy(acc.email)
    }, "Copy")), /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold mb-2"
    }, "Recipient UID: ", acc.uid, /*#__PURE__*/React.createElement("button", {
      className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
      onClick: () => copy(acc.uid)
    }, "Copy")), /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold"
    }, "Amount to Send: ", fmt(wizardSendUSDT), " USDT", /*#__PURE__*/React.createElement("button", {
      className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
      onClick: () => copy(String(wizardSendUSDT))
    }, "Copy")), wizardRoute === "stay" && /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold mt-2"
    }, "Amount you receive: ", `${fmt(wizardPayTZS)} TZS`));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-gray-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-1.5 font-bold"
  }, "Attach Transfer Proof (images only, up to 3)"), wizardFiles.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 flex flex-wrap gap-1"
  }, wizardFiles.map((file, idx) => {
    const src = URL.createObjectURL(file);
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "relative group"
    }, /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: file.name,
      className: "w-16 h-16 object-cover rounded-md border border-white/10",
      onLoad: e => URL.revokeObjectURL(src)
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setWizardFiles(wizardFiles.filter((_, i) => i !== idx)),
      className: "absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] hidden group-hover:flex items-center justify-center shadow",
      title: "Remove"
    }, "\xD7"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-1.5 text-xs"
  }, "Selected (", wizardFiles.length, "/3): ", wizardFiles.map(f => f.name).join(", "))), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: e => {
      const newFiles = Array.from(e.target.files || []);
      const combined = [...wizardFiles, ...newFiles].slice(0, 3);
      setWizardFiles(combined);
      e.target.value = '';
    },
    disabled: wizardFiles.length >= 3,
    className: "w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
  }))), wizardStep === 8 && wizardSide === "Buy" && /*#__PURE__*/React.createElement("div", {
    className: "border border-gray-700 rounded-xl p-3.5 bg-black/40"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mt-0 text-yellow-400"
  }, "Kindly make payment carefully. Do not make payment via third party; pay through your verified names only please."), /*#__PURE__*/React.createElement("div", {
    className: "text-base font-bold mb-2"
  }, "Account Name: ", WIZARD_BUY_RECEIVER.name, /*#__PURE__*/React.createElement("button", {
    className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
    onClick: () => copy(WIZARD_BUY_RECEIVER.name)
  }, "Copy")), /*#__PURE__*/React.createElement("div", {
    className: "text-base font-bold mb-2"
  }, "Account Number: ", WIZARD_BUY_RECEIVER.number, /*#__PURE__*/React.createElement("button", {
    className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
    onClick: () => copy(WIZARD_BUY_RECEIVER.number)
  }, "Copy")), /*#__PURE__*/React.createElement("div", {
    className: "text-base font-bold"
  }, "Amount to Pay: ", fmt(wizardPayTZS), "/=", /*#__PURE__*/React.createElement("button", {
    className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
    onClick: () => copy(String(wizardPayTZS))
  }, "Copy")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-gray-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-1.5 font-bold"
  }, "Attach Payment Proof (images only, up to 3)"), wizardFiles.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 flex flex-wrap gap-1"
  }, wizardFiles.map((file, idx) => {
    const src = URL.createObjectURL(file);
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "relative group"
    }, /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: file.name,
      className: "w-16 h-16 object-cover rounded-md border border-white/10",
      onLoad: e => URL.revokeObjectURL(src)
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setWizardFiles(wizardFiles.filter((_, i) => i !== idx)),
      className: "absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] hidden group-hover:flex items-center justify-center shadow",
      title: "Remove"
    }, "\xD7"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-1.5 text-xs"
  }, "Selected (", wizardFiles.length, "/3): ", wizardFiles.map(f => f.name).join(", "))), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: e => {
      const newFiles = Array.from(e.target.files || []);
      const combined = [...wizardFiles, ...newFiles].slice(0, 3);
      setWizardFiles(combined);
      e.target.value = '';
    },
    disabled: wizardFiles.length >= 3,
    className: "w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("button", {
    className: `px-4 py-2 rounded-lg border border-white/10 text-white cursor-pointer ${wizardStep === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10"}`,
    onClick: wizardOnBack,
    disabled: wizardStep === 1
  }, "Back"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center"
  }, wizardStep < wizardStepCount ? /*#__PURE__*/React.createElement("button", {
    className: `px-5 py-2 rounded-lg text-white font-semibold ${wizardCanNext() ? "bg-blue-600 hover:bg-blue-500" : "bg-gray-600 cursor-not-allowed"}`,
    onClick: wizardOnNext,
    disabled: !wizardCanNext()
  }, "Next") : /*#__PURE__*/React.createElement("button", {
    className: "px-5 py-2 rounded-lg text-white font-semibold bg-emerald-600 hover:bg-emerald-500",
    onClick: (e) => {
      console.log('Submit button clicked (desktop)');
      wizardSubmit();
    }
  }, "Submit Order")))))), /*#__PURE__*/React.createElement(Section, {
    id: "top",
    className: "pt-8 sm:pt-12 md:pt-24"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-6 sm:gap-10 items-center"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-3xl sm:text-4xl md:text-6xl font-extrabold leading-tight"
  }, /*#__PURE__*/React.createElement("span", {
    className: "bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-300 to-cyan-400"
  }, "Fast, Secure, and Reliable"), /*#__PURE__*/React.createElement("br", null), "Crypto Trading in Tanzania."), /*#__PURE__*/React.createElement("p", {
    className: "mt-3 sm:mt-4 text-sm sm:text-base text-white/80 max-w-xl"
  }, "Public rates. Private speed. A premium P2P desk built for trust, clarity, and instant settlement."), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3"
  }, /*#__PURE__*/React.createElement(Button, {
    as: "a",
    href: "#prices",
    className: "min-h-[44px]"
  }, "View Live Prices"), /*#__PURE__*/React.createElement(Button, {
    as: "a",
    href: wa("Hello, I want to trade via jordanmwinukatz P2P Trading."),
    onClick: () => trackWhatsAppClick('hero_section'),
    className: "min-h-[44px]"
  }, "WhatsApp Chat"))), /*#__PURE__*/React.createElement("div", {
    className: "hidden md:block"
  }, /*#__PURE__*/React.createElement("div", {
    className: `rounded-3xl p-6 ${gradientBg} border border-white/10 shadow-2xl`
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-3 gap-4"
  }, ["Speed", "Security", "Support"].map(k => /*#__PURE__*/React.createElement(Card, {
    key: k
  }, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, k)), /*#__PURE__*/React.createElement(CardContent, {
    className: "text-sm text-white/70"
  }, k === "Speed" && "Instant confirmations across major platforms.", k === "Security" && "Verified flows and transparent receipts.", k === "Support" && "24/7 assistance on WhatsApp.")))))))), /*#__PURE__*/React.createElement("section", {
    id: "prices",
    className: "py-10 sm:py-16"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-4xl mx-auto px-4"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl sm:text-4xl font-extrabold text-center text-blue-400 tracking-wide uppercase"
  }, "Currently Offer"), /*#__PURE__*/React.createElement("p", {
    className: "text-lg sm:text-xl font-semibold text-center text-yellow-400 mt-2"
  }, "Price Preview"), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 bg-[var(--card,rgba(30,41,59,0.85))] border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.35)] max-w-3xl mx-auto p-6 sm:p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 text-2xl sm:text-3xl font-extrabold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-full bg-emerald-500 text-slate-900 flex items-center justify-center font-black text-lg"
  }, "\u20AE"), /*#__PURE__*/React.createElement("span", null, "USDT"), /*#__PURE__*/React.createElement("span", {
    className: "text-slate-400 text-base sm:text-lg font-semibold"
  }, "(Tether)")), /*#__PURE__*/React.createElement("div", {
    className: "mt-5 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full text-center text-lg sm:text-xl font-semibold"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "uppercase tracking-wide text-emerald-400"
  }, "Buy"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-emerald-300 text-2xl font-bold"
  }, formatPriceTzs(liveBuyRate))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "uppercase tracking-wide text-orange-400"
  }, "Sell"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-orange-300 text-2xl font-bold"
  }, formatPriceTzs(liveSellRate)))), /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-400 mt-3"
  }, lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : 'Awaiting live quote'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 bg-[var(--card,rgba(30,41,59,0.85))] border border-white/10 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.25)] max-w-3xl mx-auto p-6 sm:p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-6 text-center text-lg font-semibold"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2 text-xl font-extrabold mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-full bg-amber-500 text-slate-900 flex items-center justify-center font-black"
  }, "\u20BF"), /*#__PURE__*/React.createElement("span", null, "BTC (Bitcoin)")), /*#__PURE__*/React.createElement("p", {
    className: "text-emerald-300 font-bold"
  }, "Buy: 170,000,000.00 TZS"), /*#__PURE__*/React.createElement("p", {
    className: "text-orange-300 font-bold mt-1"
  }, "Sell: 168,000,000.00 TZS")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-2 text-xl font-extrabold mb-2"
  }, /*#__PURE__*/React.createElement("span", {
    className: "w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black"
  }, "\u039E"), /*#__PURE__*/React.createElement("span", null, "ETH (Ethereum)")), /*#__PURE__*/React.createElement("p", {
    className: "text-emerald-300 font-bold"
  }, "Buy: 10,000,000.00 TZS"), /*#__PURE__*/React.createElement("p", {
    className: "text-orange-300 font-bold mt-1"
  }, "Sell: 9,800,000.00 TZS")))), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 flex justify-center gap-3"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setPriceMode('buy'),
    className: `px-6 py-3 rounded-lg font-semibold text-sm sm:text-base transition ${priceMode === 'buy' ? 'bg-emerald-500 text-slate-900 shadow-lg shadow-emerald-500/40' : 'bg-slate-800 text-white/80 hover:bg-slate-700'}`
  }, "BUY"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setPriceMode('sell'),
    className: `px-6 py-3 rounded-lg font-semibold text-sm sm:text-base transition ${priceMode === 'sell' ? 'bg-orange-500 text-slate-900 shadow-lg shadow-orange-500/40' : 'bg-slate-800 text-white/80 hover:bg-slate-700'}`
  }, "SELL")), /*#__PURE__*/React.createElement("h3", {
    className: "mt-6 text-center text-lg sm:text-xl font-extrabold text-slate-200 uppercase"
  }, priceMode === 'buy' ? 'Buy Details' : 'Sell Details'), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 bg-slate-900/70 border border-white/10 rounded-2xl overflow-hidden"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-sm sm:text-base"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-slate-900/80 text-slate-300 uppercase tracking-wide text-xs sm:text-sm"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left"
  }, "Asset"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left"
  }, "Price (TZS)"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-left"
  }, "Limits"), /*#__PURE__*/React.createElement("th", {
    className: "px-4 py-3 text-center"
  }, "Action"))), /*#__PURE__*/React.createElement("tbody", null, offerDetails[priceMode].map(row => /*#__PURE__*/React.createElement("tr", {
    key: `${priceMode}-${row.asset}`,
    className: "border-t border-white/5"
  }, /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 font-semibold text-white"
  }, row.asset), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 font-semibold",
    style: {
      color: priceMode === 'buy' ? '#22c55e' : '#f97316'
    }
  }, row.price), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-white/80"
  }, row.limit), /*#__PURE__*/React.createElement("td", {
    className: "px-4 py-3 text-center"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "row-btn px-4 py-2 rounded-md font-semibold text-white transition",
    style: {
      background: priceMode === 'buy' ? '#22c55e' : '#f97316'
    },
    onClick: () => openQuickOrder(priceMode === 'buy' ? 'Buy' : 'Sell')
  }, priceMode === 'buy' ? 'Buy' : 'Sell'))))))), /*#__PURE__*/React.createElement("div", {
    className: "mt-6 text-center"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-blue-400 font-extrabold text-lg sm:text-xl"
  }, priceMode === 'buy' ? 'Buy Payment Methods' : 'Sell Payment Methods'), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex flex-wrap justify-center gap-2 sm:gap-3"
  }, currentPaymentMethods.length === 0 ? /*#__PURE__*/React.createElement("span", {
    className: "text-sm text-slate-400"
  }, "Loading payment methods...") : currentPaymentMethods.map(method => /*#__PURE__*/React.createElement("span", {
    key: `${priceMode}-${method}`,
    className: "px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm",
    style: {
      background: paymentColor(method)
    }
  }, method)))), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-yellow-300 font-semibold text-lg sm:text-xl"
  }, "Want more payment methods or higher limits? Click below to switch into"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: handleAdvancementClick,
    className: "mt-3 inline-flex items-center gap-3 text-blue-400 hover:text-blue-300 font-semibold text-lg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-2xl animate-pulse"
  }, "\u27A1\uFE0F"), /*#__PURE__*/React.createElement("span", null, "Advancement Advertisements Mode"))), /*#__PURE__*/React.createElement("div", {
    className: "mt-10 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl sm:text-5xl mb-3 animate-bounce"
  }, "\uD83D\uDC47"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: scrollToOrderWizard,
    className: "bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg shadow-lg shadow-blue-500/30 transition"
  }, "Place an Order")))), /*#__PURE__*/React.createElement(Section, {
    id: "about"
  }, /*#__PURE__*/React.createElement(Title, {
    k: "About",
    sub: "Personal, transparent, and built around your speed of business."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-2 gap-6"
  }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardContent, {
    className: "text-white/80"
  }, "At ", /*#__PURE__*/React.createElement("b", {
    className: "text-white"
  }, BUSINESS_NAME), ", we make crypto simple, safe, and fast. Founded by Jordan Mwinuka, we focus on honest pricing, instant delivery, and clear communication\u2014so you trade with confidence.")), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardContent, {
    className: "text-white/80"
  }, "We operate a hybrid pricing model powered by public APIs and precision manual control, ensuring competitive spreads while protecting execution quality across market conditions.")))), /*#__PURE__*/React.createElement(Section, {
    id: "how"
  }, /*#__PURE__*/React.createElement(Title, {
    k: "How It Works",
    sub: "From quote to confirmation in four clean steps."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-4 gap-5"
  }, [{
    title: "1) Check Price",
    desc: "See the latest buy/sell rates for your platform."
  }, {
    title: "2) Submit Order",
    desc: "Fill a short form with WhatsApp and amount."
  }, {
    title: "3) Pay & Upload",
    desc: "Follow payment access, upload your receipt, add exchange email."
  }, {
    title: "4) Confirm",
    desc: "We verify and release crypto/fiat instantly."
  }].map((s, i) => /*#__PURE__*/React.createElement(Card, {
    key: i
  }, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, s.title)), /*#__PURE__*/React.createElement(CardContent, {
    className: "text-sm text-white/70"
  }, s.desc))))), /*#__PURE__*/React.createElement(Section, {
    id: "why"
  }, /*#__PURE__*/React.createElement(Title, {
    k: "Why Choose Us",
    sub: "Credibility, speed, and round-the-clock support."
  }), /*#__PURE__*/React.createElement("div", {
    className: "grid md:grid-cols-4 gap-5"
  }, [{
    title: "Instant Transactions",
    desc: "Rapid confirmations on major platforms."
  }, {
    title: "Trusted & Verified",
    desc: "Transparent flows and clean records."
  }, {
    title: "24/7 Support",
    desc: "WhatsApp assistance whenever you need it."
  }, {
    title: "Best Market Rates",
    desc: "Competitive, clearly displayed spreads."
  }].map((b, i) => /*#__PURE__*/React.createElement(Card, {
    key: i
  }, /*#__PURE__*/React.createElement(CardHeader, null, /*#__PURE__*/React.createElement(CardTitle, null, b.title)), /*#__PURE__*/React.createElement(CardContent, {
    className: "text-sm text-white/70"
  }, b.desc))))), /*#__PURE__*/React.createElement(Section, {
    id: "comments"
  }, /*#__PURE__*/React.createElement(Title, {
    k: "Community Comments",
    sub: "Public feedback (mock) \u2014 Auth required to post."
  }), /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, "Guest"), " \u2022 ", /*#__PURE__*/React.createElement("span", {
    className: "text-white/60"
  }, "just now")), /*#__PURE__*/React.createElement("div", {
    className: "mt-1 text-white/80"
  }, "Great rates and quick response!"), /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => alert("Login required (mock)")
  }, "Add Comment"))))), /*#__PURE__*/React.createElement(Section, {
    id: "contact"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-6xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-10"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-300 to-cyan-400 text-left"
  }, "Start Your Order"), /*#__PURE__*/React.createElement("p", {
    className: "text-white/70 mt-2 max-w-2xl text-left"
  }, "Complete order wizard with P2P integration and step-by-step guidance")), /*#__PURE__*/React.createElement(Card, {
    className: "relative",
    style: {
      border: "1px solid #202636",
      borderRadius: "24px",
      background: "linear-gradient(180deg,#0f1115 0%, #0b0c10 60%)",
      padding: "32px",
      boxShadow: "0 0 0 1px #202636, 0 18px 40px rgba(0,0,0,.5)"
    }
  }, wizardSide && /*#__PURE__*/React.createElement("div", {
    className: "absolute top-4 right-4 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-bold text-white",
    style: {
      background: wizardSide === "Buy" ? "#065f46" : "#7f1d1d"
    }
  }, wizardSide.toUpperCase()), /*#__PURE__*/React.createElement("div", {
    className: "text-center text-3xl font-black mb-2",
    style: {
      color: "#ffffff"
    }
  }, "jordanmwinukatz"), /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-center mb-2",
    style: {
      color: "#fbbf24"
    }
  }, "Start Your Order"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm opacity-85 text-center mb-4"
  }, "Step ", wizardStep, " of ", wizardStepCount), false && authUser && authUser.email_verified === false && /*#__PURE__*/React.createElement("div", { // EMAIL VERIFICATION DISABLED
    className: "mb-6 p-5 rounded-2xl border-4 border-red-500 bg-gradient-to-r from-red-900/40 via-red-800/30 to-red-900/40 text-white text-center shadow-2xl animate-pulse"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-12 h-12 mx-auto text-red-400",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
  }))), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold mb-2 text-red-100"
  }, "🚫 EMAIL VERIFICATION REQUIRED"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm mb-3 text-red-50 font-medium"
  }, "You must verify your email address before you can place orders."), /*#__PURE__*/React.createElement("p", {
    className: "text-xs mb-4 text-red-100"
  }, "Check your email inbox for the verification link, or click the button below to resend it."), /*#__PURE__*/React.createElement("a", {
    href: "verify_email.html",
    className: "inline-block px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 text-slate-900 font-bold text-sm hover:from-yellow-300 hover:via-yellow-200 hover:to-yellow-300 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
  }, "✓ Verify Email Now")), false && authUser && authUser.email_verified === false && /*#__PURE__*/React.createElement("div", { // EMAIL VERIFICATION DISABLED
    className: "mb-6 p-4 rounded-xl border-2 border-red-400 bg-red-950/50 backdrop-blur-sm text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-red-100 text-sm font-semibold mb-1"
  }, "⚠️ The order wizard is completely disabled until your email is verified."), /*#__PURE__*/React.createElement("p", {
    className: "text-red-200 text-xs"
  }, "All order functions will remain locked until verification is complete.")), wizardFinalSubmitted && /*#__PURE__*/React.createElement("div", {
    className: "mb-4 px-4 py-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 text-sm font-semibold text-center shadow-lg"
  }, "Order submitted successfully. Our team will reach out shortly."), wizardStep === 1 && /*#__PURE__*/React.createElement("select", {
    value: wizardSide,
    onChange: e => {
      if (!authUser) {
        setWizardSide(e.target.value);
        setAuthOpen(true);
        return;
      }
      // EMAIL VERIFICATION DISABLED
      // Block if email not verified
      // if (authUser && authUser.email_verified === false) {
      //   setToast({
      //     type: 'error',
      //     message: 'Please verify your email address before placing orders. Redirecting to verification page...'
      //   });
      //   setTimeout(() => {
      //     window.location.href = 'verify_email.html';
      //   }, 1500);
      //   return;
      // }
      setWizardSide(e.target.value);
    },
    disabled: false, // EMAIL VERIFICATION DISABLED: authUser && authUser.email_verified === false,
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Action"), /*#__PURE__*/React.createElement("option", {
    value: "Buy"
  }, "Buy"), /*#__PURE__*/React.createElement("option", {
    value: "Sell"
  }, "Sell")), wizardStep === 2 && /*#__PURE__*/React.createElement("select", {
    value: wizardRoute,
    onChange: e => setWizardRoute(e.target.value),
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Trade Route"), /*#__PURE__*/React.createElement("option", {
    value: "stay"
  }, "Stay Here"), /*#__PURE__*/React.createElement("option", {
    value: "p2p"
  }, "Open P2P Market Inside")), wizardStep === 3 && wizardRoute === "stay" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm mb-2"
  }, "Rate: 1 USDT = ", fmt(WIZARD_RATE), "/="), /*#__PURE__*/React.createElement("select", {
    value: wizardUnit,
    onChange: e => {
      setWizardUnit(e.target.value);
      setWizardTzs("");
      setWizardUsdt("");
      setWizardAmtErr("");
    },
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Amount Unit"), /*#__PURE__*/React.createElement("option", {
    value: "TZS"
  }, "TZS"), /*#__PURE__*/React.createElement("option", {
    value: "USDT"
  }, "USDT")), wizardUnit === "TZS" && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "numeric",
    placeholder: `Enter amount (min ${fmt(wizardTzsMin) || '1'}/=, max ${fmt(WIZARD_MAX_TZS)}/=`,
    value: wizardTzs,
    onChange: e => wizardSyncFromTZS(e.target.value),
    className: "flex-1 p-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardTzs)
  }, "Paste")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-sm"
  }, wizardSide === "Sell" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Amount you send: ", /*#__PURE__*/React.createElement("b", null, fmt(wizardUsdt)), " USDT") : /*#__PURE__*/React.createElement(React.Fragment, null, "Amount you receive: ", /*#__PURE__*/React.createElement("b", null, fmt(wizardUsdt)), " USDT")), !!wizardAmtErr && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 text-red-400 text-xs"
  }, wizardAmtErr)), wizardUnit === "USDT" && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    type: "number",
    inputMode: "decimal",
    placeholder: `Enter amount (min ${fmt(WIZARD_MIN_USDT)} USDT, max ${fmt(WIZARD_MAX_USDT)} USDT)`,
    value: wizardUsdt,
    onChange: e => wizardSyncFromUSDT(e.target.value),
    className: "flex-1 p-2.5 rounded-lg bg-white/5 border border-white/10 text-white"
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardUsdt)
  }, "Paste")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 text-sm"
  }, wizardSide === "Sell" ? /*#__PURE__*/React.createElement(React.Fragment, null, "Amount you receive: ", /*#__PURE__*/React.createElement("b", null, fmt(wizardTzs)), "/=") : /*#__PURE__*/React.createElement(React.Fragment, null, "Amount you pay: ", /*#__PURE__*/React.createElement("b", null, fmt(wizardTzs)), "/=")), !!wizardAmtErr && /*#__PURE__*/React.createElement("div", {
    className: "mt-1.5 text-red-400 text-xs"
  }, wizardAmtErr))), wizardStep === 3 && wizardRoute === "p2p" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm mb-2"
  }, "Choose exchange to browse P2P offers inside this page."), /*#__PURE__*/React.createElement("select", {
    value: wizardP2pPlatform,
    onChange: e => {
      setWizardP2pPlatform(e.target.value);
      setWizardPlatform(e.target.value);
      // Automatically open P2P market when platform is selected
      if (e.target.value) {
        trackButtonClick('p2p_market_auto_open', 'wizard_step_3');
        window.open(WIZARD_P2P_URLS(wizardSide, e.target.value), '_blank', 'noopener,noreferrer');
      }
    },
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Exchange"), WIZARD_PLATFORMS.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p)))), wizardStep === 4 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("select", {
    value: wizardPayment,
    onChange: e => {
      const selectedPayment = e.target.value;
      setWizardPayment(selectedPayment);
      setWizardSellAccMode(""); // Reset mode - useEffect will auto-select "saved" if available
      // Auto-advance will be handled by useEffect if validation passes
    },
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Payment Method"), WIZARD_PAYMENT_METHODS.map(m => /*#__PURE__*/React.createElement("option", {
    key: m,
    value: m
  }, m))), wizardSide === "Sell" && wizardRoute === "stay" && wizardPayment && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 font-bold"
  }, "Provide your payment method"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2.5 flex-wrap"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setWizardSellAccMode("saved");
      // Auto-advance will be handled by useEffect if validation passes
    },
    className: `px-4 py-2 rounded-lg border-none text-white cursor-pointer ${wizardSellAccMode === "saved" ? "bg-green-700" : "bg-gray-600"}`
  }, "Use Saved Account"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setWizardSellAccMode("new"),
    className: `px-4 py-2 rounded-lg border-none text-white cursor-pointer ${wizardSellAccMode === "new" ? "bg-blue-600" : "bg-gray-600"}`
  }, "Enter New Account")), wizardSellAccMode === "saved" && (() => {
    const savedAccounts = Array.isArray(wizardUserSavedAccounts[wizardPayment]) ? wizardUserSavedAccounts[wizardPayment] : [];
    const hasMultiple = savedAccounts.length > 1;
    const selectedAccount = savedAccounts.find(acc => acc.id === wizardSelectedSavedAccountId) || savedAccounts[0];

    return /*#__PURE__*/React.createElement("div", {
      className: "mt-3"
    }, hasMultiple && /*#__PURE__*/React.createElement("div", {
      className: "mb-4"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-bold mb-2"
    }, "Select Saved Account:"), /*#__PURE__*/React.createElement("select", {
      value: wizardSelectedSavedAccountId || "",
      onChange: e => {
        const accountId = parseInt(e.target.value);
        setWizardSelectedSavedAccountId(accountId);
        const acc = savedAccounts.find(a => a.id === accountId);
        if (acc) {
          setWizardSellAccName(acc.name || "");
          setWizardSellAccNumber(acc.number || "");
        }
      },
      className: "block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
    }, savedAccounts.map((acc, index) => /*#__PURE__*/React.createElement("option", {
      key: acc.id,
      value: acc.id
    }, savedAccounts.length > 1 ? `Account ${index + 1}: ${acc.name} - ${acc.number}` : `${acc.name} - ${acc.number}`)))), /*#__PURE__*/React.createElement("div", {
      className: "mb-4"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-bold mb-2"
    }, "Account Name:"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      className: "block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
      placeholder: "Not set",
      value: selectedAccount?.name || "",
      readOnly: true
    })), /*#__PURE__*/React.createElement("div", {
      className: "mb-4"
    }, /*#__PURE__*/React.createElement("label", {
      className: "block text-sm font-bold mb-2"
    }, "Account / Wallet Number:"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      className: "block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
      placeholder: "Not set",
      value: selectedAccount?.number || "",
      readOnly: true
    })), selectedAccount ? /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-xs opacity-80"
    }, "Account ready. Click \"Next\" to continue.") : /*#__PURE__*/React.createElement("div", {
      className: "mt-2 text-xs text-yellow-500"
    }, "No saved details for this method. Please choose \"Enter New Account\"."));
  })(), wizardSellAccMode === "new" && /*#__PURE__*/React.createElement("div", {
    className: "mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center mb-2"
  }, /*#__PURE__*/React.createElement("input", {
    className: "flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white",
    placeholder: "Account Holder Name",
    value: wizardSellAccName,
    onChange: e => setWizardSellAccName(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardSellAccName)
  }, "Paste")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    className: "flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white",
    placeholder: "Account / Wallet Number",
    value: wizardSellAccNumber,
    onChange: e => setWizardSellAccNumber(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardSellAccNumber)
  }, "Paste")), authUser && authUser.id && /*#__PURE__*/React.createElement("div", {
    className: "mt-3 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    id: "save-account-checkbox",
    checked: wizardSaveAccount,
    onChange: e => setWizardSaveAccount(e.target.checked),
    className: "w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
  }), /*#__PURE__*/React.createElement("label", {
    htmlFor: "save-account-checkbox",
    className: "text-sm text-white/80 cursor-pointer"
  }, "Save this account for future use"))))), wizardStep === 5 && wizardRoute === "stay" && /*#__PURE__*/React.createElement("select", {
    value: wizardPlatform,
    onChange: e => {
      const selectedPlatform = e.target.value;
      setWizardPlatform(selectedPlatform);
      // Auto-advance will be handled by useEffect if validation passes
    },
    className: "w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "Select Platform"), WIZARD_PLATFORMS.map(p => /*#__PURE__*/React.createElement("option", {
    key: p,
    value: p
  }, p))), wizardStep === 6 && (wizardSide === "Sell" ? /*#__PURE__*/React.createElement("div", {
    className: "border border-gray-700 rounded-xl p-3.5 bg-black/40"
  }, /*#__PURE__*/React.createElement("b", null, "Preview"), /*#__PURE__*/React.createElement("div", null, "Payment Method: ", wizardPayment || "-"), /*#__PURE__*/React.createElement("div", null, "Account Name: ", wizardSellAccName || "-"), /*#__PURE__*/React.createElement("div", null, "Account No.: ", wizardSellAccNumber || "-"), /*#__PURE__*/React.createElement("div", null, "Exchange: ", wizardRoute === "p2p" ? wizardP2pPlatform || "-" : wizardPlatform || "-"), /*#__PURE__*/React.createElement("div", null, wizardRoute === "stay" ? `Amount you send: ${fmtUsd(wizardSendUSDT)} USDT` : "—"), wizardRoute === "stay" && /*#__PURE__*/React.createElement("div", null, `Amount you receive: ${fmt(wizardPayTZS)} TZS`)) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center mb-2"
  }, /*#__PURE__*/React.createElement("input", {
    className: "flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white",
    placeholder: "Exchange Email Address",
    value: wizardUserEmail,
    onChange: e => setWizardUserEmail(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardUserEmail)
  }, "Paste")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 items-center"
  }, /*#__PURE__*/React.createElement("input", {
    className: "flex-1 p-3 rounded-lg bg-white/5 border border-white/10 text-white",
    placeholder: "Exchange UID",
    value: wizardUserUID,
    onChange: e => setWizardUserUID(e.target.value)
  }), /*#__PURE__*/React.createElement("button", {
    className: "px-3 py-2 rounded-lg border border-gray-600 bg-slate-900 text-white text-sm cursor-pointer",
    onClick: () => wizardPasteInto(setWizardUserUID)
  }, "Paste")))), wizardStep === 7 && wizardSide === "Buy" && /*#__PURE__*/React.createElement("div", {
    className: "border border-gray-700 rounded-xl p-3.5 bg-black/40"
  }, /*#__PURE__*/React.createElement("b", null, "Preview"), /*#__PURE__*/React.createElement("div", {
    className: "mt-2"
  }, "Payment Method: ", wizardPayment || "-"), /*#__PURE__*/React.createElement("div", null, "Platform: ", wizardRoute === "p2p" ? wizardP2pPlatform || "-" : wizardPlatform || "-"), /*#__PURE__*/React.createElement("div", null, "Email: ", wizardUserEmail || "-"), /*#__PURE__*/React.createElement("div", null, "UID: ", wizardUserUID || "-"), /*#__PURE__*/React.createElement("div", null, `Amount you pay: ${fmt(wizardUnit === "TZS" ? wizardTzs : wizardPayTZS)} TZS`), /*#__PURE__*/React.createElement("div", null, `Amount you receive: ${fmtUsd(wizardSendUSDT)} USDT`)), wizardStep === 7 && wizardSide === "Sell" && /*#__PURE__*/React.createElement("div", {
    className: "border border-gray-700 rounded-xl p-3.5 bg-black/40"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mt-0 text-yellow-400"
  }, "Send USDT by internal transfer only. Use the details below."), (() => {
    const acc = wizardRoute === "p2p" ? WIZARD_SELL_RECEIVE_MAP[wizardP2pPlatform] : WIZARD_SELL_RECEIVE_MAP[wizardPlatform];
    if (!acc) return /*#__PURE__*/React.createElement("div", {
      className: "opacity-80"
    }, "Select a platform to view recipient details.");
    return /*#__PURE__*/React.createElement(React.Fragment, null, acc.username ? /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold mb-2"
    }, "Recipient Username: ", acc.username, /*#__PURE__*/React.createElement("button", {
      className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
      onClick: () => copy(acc.username)
    }, "Copy")) : null, /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold mb-2"
    }, "Recipient Email: ", acc.email, /*#__PURE__*/React.createElement("button", {
      className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
      onClick: () => copy(acc.email)
    }, "Copy")), /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold mb-2"
    }, "Recipient UID: ", acc.uid, /*#__PURE__*/React.createElement("button", {
      className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
      onClick: () => copy(acc.uid)
    }, "Copy")), /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold"
    }, "Amount to Send: ", fmt(wizardSendUSDT), " USDT", /*#__PURE__*/React.createElement("button", {
      className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
      onClick: () => copy(String(wizardSendUSDT))
    }, "Copy")), wizardRoute === "stay" && /*#__PURE__*/React.createElement("div", {
      className: "text-base font-bold mt-2"
    }, "Amount you receive: ", `${fmt(wizardPayTZS)} TZS`));
  })(), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-gray-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-1.5 font-bold"
  }, "Attach Transfer Proof (images only, up to 3)"), wizardFiles.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 flex flex-wrap gap-1"
  }, wizardFiles.map((file, idx) => {
    const src = URL.createObjectURL(file);
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "relative group"
    }, /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: file.name,
      className: "w-16 h-16 object-cover rounded-md border border-white/10",
      onLoad: e => URL.revokeObjectURL(src)
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setWizardFiles(wizardFiles.filter((_, i) => i !== idx)),
      className: "absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] hidden group-hover:flex items-center justify-center shadow",
      title: "Remove"
    }, "\xD7"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-1.5 text-xs"
  }, "Selected (", wizardFiles.length, "/3): ", wizardFiles.map(f => f.name).join(", "))), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: e => {
      const newFiles = Array.from(e.target.files || []);
      const combined = [...wizardFiles, ...newFiles].slice(0, 3);
      setWizardFiles(combined);
      e.target.value = ''; // Reset input to allow selecting same file again
    },
    disabled: wizardFiles.length >= 3,
    className: "w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
  }))), wizardStep === 8 && wizardSide === "Buy" && /*#__PURE__*/React.createElement("div", {
    className: "border border-gray-700 rounded-xl p-3.5 bg-black/40"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "mt-0 text-yellow-400"
  }, "Kindly make payment carefully. Do not make payment via third party; pay through your verified names only please."), /*#__PURE__*/React.createElement("div", {
    className: "text-base font-bold mb-2"
  }, "Account Name: ", WIZARD_BUY_RECEIVER.name, /*#__PURE__*/React.createElement("button", {
    className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
    onClick: () => copy(WIZARD_BUY_RECEIVER.name)
  }, "Copy")), /*#__PURE__*/React.createElement("div", {
    className: "text-base font-bold mb-2"
  }, "Account Number: ", WIZARD_BUY_RECEIVER.number, /*#__PURE__*/React.createElement("button", {
    className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
    onClick: () => copy(WIZARD_BUY_RECEIVER.number)
  }, "Copy")), /*#__PURE__*/React.createElement("div", {
    className: "text-base font-bold"
  }, "Amount to Pay: ", fmt(wizardPayTZS), "/=", /*#__PURE__*/React.createElement("button", {
    className: "ml-2 px-1.5 py-0.5 rounded border border-gray-600 bg-white/5 text-white text-xs cursor-pointer",
    onClick: () => copy(String(wizardPayTZS))
  }, "Copy")), /*#__PURE__*/React.createElement("div", {
    className: "mt-3 pt-3 border-t border-gray-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-1.5 font-bold"
  }, "Attach Payment Proof (images only, up to 3)"), wizardFiles.length > 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mb-2 flex flex-wrap gap-1"
  }, wizardFiles.map((file, idx) => {
    const src = URL.createObjectURL(file);
    return /*#__PURE__*/React.createElement("div", {
      key: idx,
      className: "relative group"
    }, /*#__PURE__*/React.createElement("img", {
      src: src,
      alt: file.name,
      className: "w-16 h-16 object-cover rounded-md border border-white/10",
      onLoad: e => URL.revokeObjectURL(src)
    }), /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => setWizardFiles(wizardFiles.filter((_, i) => i !== idx)),
      className: "absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white text-[10px] hidden group-hover:flex items-center justify-center shadow",
      title: "Remove"
    }, "\xD7"));
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-1.5 text-xs"
  }, "Selected (", wizardFiles.length, "/3): ", wizardFiles.map(f => f.name).join(", "))), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    multiple: true,
    onChange: e => {
      const newFiles = Array.from(e.target.files || []);
      const combined = [...wizardFiles, ...newFiles].slice(0, 3);
      setWizardFiles(combined);
      e.target.value = ''; // Reset input to allow selecting same file again
    },
    disabled: wizardFiles.length >= 3,
    className: "w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white disabled:opacity-50 disabled:cursor-not-allowed"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between mt-6"
  }, wizardStep > 1 ? /*#__PURE__*/React.createElement("button", {
    className: "px-5 py-2.5 rounded-lg border-none text-white cursor-pointer",
    style: {
      background: "#2563eb"
    },
    onClick: wizardOnBack
  }, "Back") : /*#__PURE__*/React.createElement("span", null), wizardStep < wizardStepCount ? isWizardSelectStep ? /*#__PURE__*/React.createElement("span", null) : /*#__PURE__*/React.createElement("button", {
    className: `px-5 py-2.5 rounded-lg border-none text-white ${wizardCanNext() ? 'cursor-pointer' : 'cursor-not-allowed'}`,
    style: {
      background: wizardCanNext() ? "#2563eb" : "#374151"
    },
    disabled: !wizardCanNext(),
    onClick: wizardOnNext
  }, "Next") : /*#__PURE__*/React.createElement("button", {
    className: `px-5 py-2.5 rounded-lg border-none text-white flex items-center justify-center gap-2 transition-all ${wizardFiles.length > 0 && !isSubmitting && !wizardFinalSubmitted ? 'cursor-pointer hover:opacity-90' : 'cursor-not-allowed opacity-60'}`,
    style: {
      background: wizardFinalSubmitted ? "#22c55e" : isSubmitting ? "#f59e0b" : wizardFiles.length > 0 ? "#2563eb" : "#374151"
    },
    disabled: wizardFiles.length === 0 || isSubmitting || wizardFinalSubmitted,
    onClick: (e) => {
      console.log('Submit button clicked', {
        wizardFilesLength: wizardFiles.length,
        isSubmitting,
        wizardFinalSubmitted,
        disabled: wizardFiles.length === 0 || isSubmitting || wizardFinalSubmitted
      });
      if (!e.currentTarget.disabled) {
        wizardSubmit();
      } else {
        console.warn('Submit button is disabled, click ignored');
      }
    }
  }, isSubmitting ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("svg", {
    className: "animate-spin h-4 w-4",
    xmlns: "http://www.w3.org/2000/svg",
    fill: "none",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "opacity-25",
    cx: "12",
    cy: "12",
    r: "10",
    stroke: "currentColor",
    strokeWidth: "4"
  }), /*#__PURE__*/React.createElement("path", {
    className: "opacity-75",
    fill: "currentColor",
    d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
  })), "Submitting...") : wizardFinalSubmitted ? /*#__PURE__*/React.createElement(React.Fragment, null, "✓ Submitted") : 'Submit Order'))))), /*#__PURE__*/React.createElement("footer", {
    className: "bg-black/60 text-white/80 border-t border-white/5 py-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full mx-auto px-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(Logo, null), /*#__PURE__*/React.createElement("div", {
    className: "text-sm opacity-80"
  }, "\xA9\uFE0F ", new Date().getFullYear(), " ", BUSINESS_NAME, ". All rights reserved.")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-6 text-sm opacity-80"
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "hover:text-white transition-colors"
  }, "Privacy"), /*#__PURE__*/React.createElement("a", {
    href: "#",
    className: "hover:text-white transition-colors"
  }, "Terms"), /*#__PURE__*/React.createElement("a", {
    href: "#top",
    className: "hover:text-white transition-colors"
  }, "Back to top")), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-start md:justify-end gap-3"
  }, /*#__PURE__*/React.createElement(Button, {
    as: "a",
    href: wa("Hello, I need assistance.")
  }, "WhatsApp"), /*#__PURE__*/React.createElement(Button, {
    as: "a",
    href: `mailto:${SUPPORT_EMAIL}`
  }, "Email"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-center gap-4 pt-6 border-t border-white/5"
  }, /*#__PURE__*/React.createElement("a", {
    href: "https://www.youtube.com/@jordanmwinukatz/",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-red-500/30",
    title: "YouTube",
    "aria-label": "Follow us on YouTube"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fab fa-youtube text-red-500 text-lg"
  })), /*#__PURE__*/React.createElement("a", {
    href: "https://t.me/jordanmwinukatz",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "w-10 h-10 rounded-full bg-white/5 hover:bg-blue-500/20 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-blue-500/30",
    title: "Telegram",
    "aria-label": "Follow us on Telegram"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fab fa-telegram text-blue-400 text-lg"
  })), /*#__PURE__*/React.createElement("a", {
    href: "https://tz.linkedin.com/in/jordan-mwinuka-571a14241",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "w-10 h-10 rounded-full bg-white/5 hover:bg-blue-600/20 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-blue-600/30",
    title: "LinkedIn",
    "aria-label": "Follow us on LinkedIn"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fab fa-linkedin text-blue-600 text-lg"
  })), /*#__PURE__*/React.createElement("a", {
    href: "https://x.com/jordanmwinukatz",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "w-10 h-10 rounded-full bg-white/5 hover:bg-gray-800/30 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-white/30",
    title: "X (Twitter)",
    "aria-label": "Follow us on X"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5 text-gray-200",
    fill: "currentColor",
    viewBox: "0 0 24 24",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
  }))), /*#__PURE__*/React.createElement("a", {
    href: "https://www.instagram.com/jordanmwinukatz/",
    target: "_blank",
    rel: "noopener noreferrer",
    className: "w-10 h-10 rounded-full bg-white/5 hover:bg-pink-500/20 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-pink-500/30",
    title: "Instagram",
    "aria-label": "Follow us on Instagram"
  }, /*#__PURE__*/React.createElement("i", {
    className: "fab fa-instagram text-pink-500 text-lg"
  }))))), /*#__PURE__*/React.createElement(Modal, {
    open: orderOpen,
    onClose: () => setOrderOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-semibold"
  }, "Start Order"), /*#__PURE__*/React.createElement("div", {
    className: "text-white/70 mb-3"
  }, "Step-by-step (preview before submit)"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 mb-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: "Your Name",
    value: order.name,
    onChange: e => setOrder({
      ...order,
      name: e.target.value
    })
  }), /*#__PURE__*/React.createElement(Input, {
    placeholder: "WhatsApp Number",
    value: order.whatsapp,
    onChange: e => setOrder({
      ...order,
      whatsapp: e.target.value
    })
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement("select", {
    className: "bg-white/5 border border-white/10 rounded-xl px-3",
    value: order.platform,
    onChange: e => setOrder({
      ...order,
      platform: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "binance"
  }, "Binance")), /*#__PURE__*/React.createElement("select", {
    className: "bg-white/5 border border-white/10 rounded-xl px-3",
    value: order.side,
    onChange: e => setOrder({
      ...order,
      side: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "buy"
  }, "Buy"), /*#__PURE__*/React.createElement("option", {
    value: "sell"
  }, "Sell"))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-2 gap-3"
  }, /*#__PURE__*/React.createElement(Input, {
    placeholder: `Amount (${order.currency})`,
    value: order.amount,
    onChange: e => setOrder({
      ...order,
      amount: e.target.value
    })
  }), /*#__PURE__*/React.createElement("select", {
    className: "bg-white/5 border border-white/10 rounded-xl px-3",
    value: order.currency,
    onChange: e => setOrder({
      ...order,
      currency: e.target.value
    })
  }, /*#__PURE__*/React.createElement("option", {
    value: "TZS"
  }, "TZS"), /*#__PURE__*/React.createElement("option", {
    value: "USDT"
  }, "USDT"))), /*#__PURE__*/React.createElement(Textarea, {
    placeholder: "Message (optional)",
    value: order.message,
    onChange: e => setOrder({
      ...order,
      message: e.target.value
    })
  })), /*#__PURE__*/React.createElement(Card, {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement(CardContent, null, /*#__PURE__*/React.createElement("div", {
    className: "text-sm space-y-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Side:"), " ", order.side), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Platform:"), " ", order.platform), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Amount:"), " ", order.amount, " ", order.currency), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "WhatsApp:"), " ", order.whatsapp), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Message:"), " ", order.message || "-")))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end gap-2"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: () => setOrderOpen(false)
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    onClick: submitOrder
  }, "Submit")))), /*#__PURE__*/React.createElement(Modal, {
    open: paymentOpen,
    onClose: () => setPaymentOpen(false)
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-lg font-semibold"
  }, "Payment & Receipt Upload"), /*#__PURE__*/React.createElement("div", {
    className: "text-white/70 mb-3"
  }, "Order ID: ", createdOrderId || "—", " \u2022 Status: ", status), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm"
  }, "Exchange Email (Binance)"), /*#__PURE__*/React.createElement(Input, {
    value: exchangeEmail,
    onChange: e => setExchangeEmail(e.target.value),
    placeholder: "your-email@exchange.com"
  }), /*#__PURE__*/React.createElement("div", {
    className: "text-sm"
  }, "Upload Receipt"), /*#__PURE__*/React.createElement(Input, {
    type: "file",
    onChange: e => setReceiptFile(e.target.files?.[0] || null)
  })), status === "awaiting" && /*#__PURE__*/React.createElement("div", {
    className: "mt-4 rounded-2xl border border-white/10 bg-black/40 p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-semibold mb-2"
  }, "Bank Details (", WIZARD_BUY_RECEIVER.bank, ")"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-white/80 space-y-1"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Bank:"), " ", WIZARD_BUY_RECEIVER.bank), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", null, "Account Name:"), " ", WIZARD_BUY_RECEIVER.name), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "Account Number:"), " ", WIZARD_BUY_RECEIVER.number), /*#__PURE__*/React.createElement(Button, {
    onClick: () => copy(WIZARD_BUY_RECEIVER.number)
  }, "Copy"))), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-white/60 mt-2"
  }, "Visible only after order is created for your security.")), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-end mt-4"
  }, /*#__PURE__*/React.createElement(Button, {
    onClick: uploadReceipt,
    disabled: !receiptFile
  }, "Submit Receipt")))), toast && /*#__PURE__*/React.createElement("div", {
    className: "fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] rounded-xl px-4 py-2 border border-white/10 bg-black/80 text-white shadow-lg"
  }, toast), authToast && /*#__PURE__*/React.createElement("div", {
    className: "fixed top-5 left-1/2 -translate-x-1/2 z-[130] animate-slide-down"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 rounded-xl px-5 py-3.5 border border-white/20 backdrop-blur-xl shadow-2xl min-w-[320px] max-w-[90vw]",
    style: {
      background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.15), rgba(6, 182, 212, 0.15))',
      borderColor: 'rgba(255, 193, 7, 0.3)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex-shrink-0"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5 text-yellow-400",
    fill: "currentColor",
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z",
    clipRule: "evenodd"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-1"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-medium text-white leading-tight"
  }, authToast.message)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAuthToast(null),
    className: "flex-shrink-0 text-gray-400 hover:text-white transition-colors"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "currentColor",
    viewBox: "0 0 20 20"
  }, /*#__PURE__*/React.createElement("path", {
    fillRule: "evenodd",
    d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
    clipRule: "evenodd"
  }))))), authOpen && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[120] flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-black/70",
    onClick: e => {
      if (!authUser) {
        e.preventDefault();
        e.stopPropagation();
        showAuthToast('Please log in or register to continue');
        return false;
      }
      setAuthOpen(false);
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative z-[121] w-full max-w-md",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl ring-1 ring-black/10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 sm:p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-start justify-between"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "text-xl sm:text-2xl font-semibold"
  }, "Log in or Create Account"), /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-sm text-slate-300"
  }, "Register to continue your order.")), authUser ? /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setAuthOpen(false);
    },
    className: "text-slate-300 hover:text-white"
  }, "\u2715") : /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      showAuthToast('Please log in or register to continue');
    },
    className: "text-slate-400 hover:text-slate-300 cursor-not-allowed",
    title: "Cannot close without logging in"
  }, "\u2715")), /*#__PURE__*/React.createElement("div", {
    className: "mt-4 grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-800/60 border border-white/10"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setAuthMode('login'),
    className: `rounded-lg py-2 text-sm font-medium ${authMode === 'login' ? 'bg-white text-slate-900 shadow' : 'text-slate-200 hover:bg-white/10'}`
  }, "Log in"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setAuthMode('create'),
    className: `rounded-lg py-2 text-sm font-medium ${authMode === 'create' ? 'bg-white text-slate-900 shadow' : 'text-slate-200 hover:bg-white/10'}`
  }, "Create Account")), /*#__PURE__*/React.createElement("form", {
    className: "mt-4 space-y-3",
    onSubmit: async e => {
      e.preventDefault();
      try {
        if (authMode === 'forgot' && !resetEmailSent) {
          if (!authForm.email.trim()) throw new Error('Email is required');
          const res = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'forgot_password',
              email: authForm.email
            })
          });
          const responseText = await res.text();
          let j;
          try {
            j = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON Parse Error:', parseError, 'Response:', responseText);
            throw new Error('Invalid response from server. Please try again.');
          }
          if (!j.success) throw new Error(j.error || 'Failed to send reset email');
          setResetEmailSent(true);
          showAuthToast('Password reset email sent! Check your inbox.');
        } else if (authMode === 'login') {
          const res = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'login',
              email: authForm.email,
              password: authForm.password
            })
          });
          const responseText = await res.text();
          let j;
          try {
            j = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON Parse Error:', parseError, 'Response:', responseText);
            throw new Error('Invalid response from server. Please try again.');
          }
          if (!j.success) throw new Error(j.error || 'Login failed');
          setAuthUser(j.user);
          localStorage.setItem('authUser', JSON.stringify(j.user));
          if (j.user && j.user.email === 'jordanmwinukatz@gmail.com') {
            window.location.href = 'admin/index.php';
            return;
          }
          setAuthOpen(false);
          // Do not auto-advance - let user complete step 1 first
          // Refresh submissions
          if (j.user && j.user.id) {
            setTimeout(() => fetchUserSubmissions(), 500);
          }
        } else {
          if (!authForm.fullName.trim()) throw new Error('Full name is required');
          if (authForm.password.length < 8) throw new Error('Password too weak (min 8)');
          if (authForm.password !== authForm.confirm) throw new Error('Passwords do not match');
          if (!authForm.agree) throw new Error('You must agree to the Terms');
          const res = await fetch('api/auth.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              action: 'register',
              name: authForm.fullName,
              email: authForm.email,
              password: authForm.password
            })
          });

          // Get response text first to handle JSON parsing errors
          const responseText = await res.text();
          let j;
          try {
            j = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON Parse Error:', parseError, 'Response:', responseText);
            throw new Error('Server returned an invalid response. Please try again. If the problem persists, the email may already be registered.');
          }

          if (!j.success) throw new Error(j.error || 'Registration failed');
          setAuthUser(j.user);
          localStorage.setItem('authUser', JSON.stringify(j.user));
          if (j.user && j.user.email === 'jordanmwinukatz@gmail.com') {
            window.location.href = 'admin/index.php';
            return;
          }
          // Check if email verification is required
          if (j.requires_verification || !j.user.email_verified) {
            showAuthToast('Registration successful! Please check your email to verify your account before placing orders. A verification link has been sent to ' + j.user.email);
            setAuthOpen(false);
            // Don't allow access to order wizard until verified
            if (orderOpen) {
              setOrderOpen(false);
            }
            return;
          }
          setAuthOpen(false);
          // Do not auto-advance - let user complete step 1 first
          // Refresh submissions
          if (j.user && j.user.id) {
            setTimeout(() => fetchUserSubmissions(), 500);
          }
        }
      } catch (err) {
        showAuthToast(err.message || 'An error occurred. Please try again.');
      }
    }
  }, authMode === 'create' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-200"
  }, "Full name"), /*#__PURE__*/React.createElement("input", {
    name: "fullName",
    value: authForm.fullName,
    onChange: e => setAuthForm({
      ...authForm,
      fullName: e.target.value
    }),
    placeholder: "e.g., Jordan Mwinuka",
    className: "mt-1 w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-400/50"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-200"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    name: "email",
    type: "email",
    value: authForm.email,
    onChange: e => setAuthForm({
      ...authForm,
      email: e.target.value
    }),
    placeholder: "you@example.com",
    className: "mt-1 w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-400/50"
  })), authMode !== 'forgot' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-200"
  }, "Password"), /*#__PURE__*/React.createElement("input", {
    name: "password",
    type: "password",
    value: authForm.password,
    onChange: e => setAuthForm({
      ...authForm,
      password: e.target.value
    }),
    placeholder: authMode === 'login' ? 'Your password' : '8+ chars, mix recommended',
    className: "mt-1 w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-400/50"
  }), authMode === 'login' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setAuthMode('forgot');
      setResetEmailSent(false);
      setAuthForm({
        ...authForm,
        password: '',
        email: authForm.email
      });
    },
    className: "mt-2 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
  }, "Forgot password?")), authMode === 'forgot' && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "text-center py-4"
  }, resetEmailSent ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-16 h-16 mx-auto text-green-400",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
  }))), /*#__PURE__*/React.createElement("p", {
    className: "text-green-400 font-semibold mb-2"
  }, "Email Sent!"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-300 mb-4"
  }, "Check your inbox for password reset instructions. The link will expire in 1 hour."), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setAuthMode('login');
      setResetEmailSent(false);
    },
    className: "text-sm text-cyan-400 hover:text-cyan-300"
  }, "Back to Login")) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("p", {
    className: "text-slate-300 mb-4"
  }, "Enter your email address and we'll send you a link to reset your password."), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      setAuthMode('login');
      setResetEmailSent(false);
    },
    className: "text-sm text-slate-400 hover:text-slate-300 mb-4"
  }, "\u2190 Back to Login")))), authMode === 'create' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-medium text-slate-200"
  }, "Confirm password"), /*#__PURE__*/React.createElement("input", {
    name: "confirm",
    type: "password",
    value: authForm.confirm,
    onChange: e => setAuthForm({
      ...authForm,
      confirm: e.target.value
    }),
    placeholder: "Re-enter password",
    className: "mt-1 w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-2.5 outline-none focus:ring-2 focus:ring-cyan-400/50"
  }), !!authForm.confirm && authForm.confirm !== authForm.password && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-rose-300"
  }, "Passwords do not match")), authMode === 'create' && /*#__PURE__*/React.createElement("label", {
    className: "inline-flex items-start gap-3 pt-1 text-sm text-slate-300"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: authForm.agree,
    onChange: e => setAuthForm({
      ...authForm,
      agree: e.target.checked
    }),
    className: "mt-1 h-4 w-4 rounded border-white/20 bg-slate-900/60"
  }), /*#__PURE__*/React.createElement("span", null, "I agree to the ", /*#__PURE__*/React.createElement("a", {
    className: "text-cyan-300 hover:underline",
    href: "#"
  }, "Terms"), " and ", /*#__PURE__*/React.createElement("a", {
    className: "text-cyan-300 hover:underline",
    href: "#"
  }, "Privacy Policy"), ".")), /*#__PURE__*/React.createElement("div", {
    className: "pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "w-full rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-300 to-cyan-400 px-4 py-2.5 font-semibold text-slate-900 shadow hover:brightness-110 active:scale-[0.99]",
    disabled: resetEmailSent
  }, authMode === 'forgot' ? resetEmailSent ? 'Email Sent' : 'Send Reset Link' : authMode === 'login' ? 'Continue' : 'Create account'))))))), showUserDashboard && authUser && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 z-[120] flex items-center justify-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 bg-black/70",
    onClick: () => setShowUserDashboard(false)
  }), /*#__PURE__*/React.createElement("div", {
    className: "relative z-[121] w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl",
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "p-6 border-b border-white/10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-white"
  }, "My Account"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-white/60 mt-1"
  }, "Welcome back, ", authUser.name)), /*#__PURE__*/React.createElement("button", {
    onClick: () => setShowUserDashboard(false),
    className: "text-white/60 hover:text-white transition-colors"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-6 h-6",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M6 18L18 6M6 6l12 12"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 border-b border-white/10"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDashboardTab('orders'),
    className: `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${dashboardTab === 'orders' ? 'text-yellow-400 border-yellow-400' : 'text-white/60 border-transparent hover:text-white/80'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  })), "Orders")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDashboardTab('profile'),
    className: `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${dashboardTab === 'profile' ? 'text-yellow-400 border-yellow-400' : 'text-white/60 border-transparent hover:text-white/80'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
  })), "Profile")), /*#__PURE__*/React.createElement("button", {
    onClick: () => setDashboardTab('settings'),
    className: `px-4 py-2 text-sm font-medium transition-colors border-b-2 ${dashboardTab === 'settings' ? 'text-yellow-400 border-yellow-400' : 'text-white/60 border-transparent hover:text-white/80'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
  }), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
  })), "Settings")))), /*#__PURE__*/React.createElement("div", {
    className: "p-6 overflow-y-auto max-h-[calc(90vh-180px)]"
  }, dashboardTab === 'orders' && /*#__PURE__*/React.createElement(React.Fragment, null, loadingSubmissions ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-12"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"
  }), /*#__PURE__*/React.createElement("p", {
    className: "mt-4 text-white/60"
  }, "Loading your orders...")) : userSubmissions.length === 0 ? /*#__PURE__*/React.createElement("div", {
    className: "text-center py-12"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-16 h-16 mx-auto text-white/20 mb-4",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  })), /*#__PURE__*/React.createElement("p", {
    className: "text-white/60 text-lg"
  }, "No orders yet"), /*#__PURE__*/React.createElement("p", {
    className: "text-white/40 text-sm mt-2"
  }, "Start by placing your first order!")) : /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, userSubmissions.map(submission => {
    const formData = submission.form_data || {};
    const isOrder = submission.submission_type === 'order_form';
    const statusColors = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    const status = submission.submission_status || 'pending';
    return /*#__PURE__*/React.createElement("div", {
      key: submission.id,
      className: "rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors mb-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-start justify-between mb-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 mb-1 flex-wrap"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-sm font-bold text-white"
    }, "Order #", submission.order_number || submission.id), /*#__PURE__*/React.createElement("span", {
      className: `px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColors[status] || statusColors.pending}`
    }, status.charAt(0).toUpperCase() + status.slice(1)), isOrder && formData.order_type && /*#__PURE__*/React.createElement("span", {
      className: `px-2 py-0.5 rounded-full text-[10px] font-bold ${formData.order_type.toLowerCase() === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`
    }, formData.order_type.toUpperCase())), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-white/50"
    }, new Date(submission.created_at).toLocaleString()))), isOrder && /*#__PURE__*/React.createElement("div", {
      className: "grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-2"
    }, formData.amount && formData.amount !== 'N/A' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-white/40 text-[10px] mb-0.5"
    }, "Amount"), /*#__PURE__*/React.createElement("p", {
      className: "text-white font-semibold text-xs"
    }, formData.amount, " ", formData.currency || 'USDT')), formData.platform && formData.platform !== 'N/A' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-white/40 text-[10px] mb-0.5"
    }, "Platform"), /*#__PURE__*/React.createElement("p", {
      className: "text-white font-semibold text-xs"
    }, formData.platform)), formData.payment_method && formData.payment_method !== 'N/A' && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-white/40 text-[10px] mb-0.5"
    }, "Payment"), /*#__PURE__*/React.createElement("p", {
      className: "text-white font-semibold text-xs"
    }, formData.payment_method)), formData.route_type && /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      className: "text-white/40 text-[10px] mb-0.5"
    }, "Route"), /*#__PURE__*/React.createElement("p", {
      className: "text-white font-semibold text-xs"
    }, formData.route_type === 'stay' ? 'Stay' : 'P2P'))), isOrder && formData.receipts && Array.isArray(formData.receipts) && formData.receipts.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mt-2 pt-2 border-t border-white/10"
    }, /*#__PURE__*/React.createElement("p", {
      className: "text-white/40 text-[10px] mb-1.5"
    }, "Payment Proof (", formData.receipts.length, ")"), /*#__PURE__*/React.createElement("div", {
      className: "flex flex-wrap gap-1.5"
    }, formData.receipts.map((receipt, idx) => {
      // Handle different path formats
      let imageSrc = receipt;
      if (!receipt.startsWith('http')) {
        // Get base path from current location
        const basePath = window.location.pathname.split('/').slice(0, -1).join('/') || '';
        // If it starts with 'uploads/', prepend base path
        if (receipt.startsWith('uploads/')) {
          imageSrc = `${basePath}/${receipt}`;
        } else if (!receipt.startsWith('/')) {
          // If it doesn't start with /, prepend base path
          imageSrc = `${basePath}/${receipt}`;
        } else {
          // If it starts with /, prepend base path (remove leading / first)
          imageSrc = `${basePath}${receipt}`;
        }
      }
      const imageHref = imageSrc;
      return /*#__PURE__*/React.createElement("a", {
        key: idx,
        href: imageHref,
        target: "_blank",
        rel: "noopener noreferrer",
        className: "block relative group",
        onClick: e => {
          e.preventDefault();
          // Open image in new tab
          window.open(imageHref, '_blank');
        }
      }, /*#__PURE__*/React.createElement("img", {
        src: imageSrc,
        alt: `Proof ${idx + 1}`,
        className: "w-14 h-14 object-cover rounded border border-white/20 hover:border-yellow-400/50 transition-colors cursor-pointer",
        onError: e => {
          // Fallback if image fails to load
          console.error('Failed to load image:', imageSrc, 'Original receipt:', receipt);
          e.target.style.display = 'none';
          const parent = e.target.parentElement;
          if (parent) {
            parent.innerHTML = `<div class="w-14 h-14 rounded border border-white/20 bg-gray-800 flex items-center justify-center text-[10px] text-white/40">Img</div>`;
          }
        }
      }), /*#__PURE__*/React.createElement("div", {
        className: "absolute inset-0 bg-black/0 hover:bg-black/30 rounded transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none"
      }, /*#__PURE__*/React.createElement("svg", {
        className: "w-4 h-4 text-white",
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24"
      }, /*#__PURE__*/React.createElement("path", {
        strokeLinecap: "round",
        strokeLinejoin: "round",
        strokeWidth: 2,
        d: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
      }))));
    }))));
  }))), dashboardTab === 'profile' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-4 pb-6 border-b border-white/10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "relative"
  }, profilePicture ? /*#__PURE__*/React.createElement("img", {
    src: profilePicture.startsWith('http') ? profilePicture : profilePicture.startsWith('uploads/') ? window.location.pathname.split('/').slice(0, -1).join('/') + '/' + profilePicture : window.location.pathname.split('/').slice(0, -1).join('/') + '/uploads/profiles/' + profilePicture,
    alt: authUser.name,
    className: "w-20 h-20 rounded-full object-cover border-2 border-white/20",
    onError: e => {
      // Fallback to initial if image fails to load
      e.target.style.display = 'none';
      const fallback = e.target.parentElement.querySelector('.profile-fallback');
      if (fallback) fallback.style.display = 'flex';
    }
  }) : null, /*#__PURE__*/React.createElement("div", {
    className: `w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-cyan-400 flex items-center justify-center text-2xl font-bold text-slate-900 ${profilePicture ? 'hidden profile-fallback' : ''}`
  }, authUser.name.charAt(0).toUpperCase()), /*#__PURE__*/React.createElement("label", {
    className: "absolute bottom-0 right-0 w-7 h-7 rounded-full bg-gradient-to-r from-yellow-400 to-cyan-400 flex items-center justify-center cursor-pointer hover:brightness-110 transition-all border-2 border-black/20"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-4 h-4 text-slate-900",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
  }), /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M15 13a3 3 0 11-6 0 3 3 0 016 0z"
  })), /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/jpeg,image/png,image/webp,image/gif",
    className: "hidden",
    onChange: async e => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file size (2MB max to match server limit)
      if (file.size > 2 * 1024 * 1024) {
        setProfileMessage({
          type: 'error',
          text: 'Image must be less than 2MB'
        });
        return;
      }
      setUploadingPicture(true);
      setProfileMessage(null);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('api/upload_profile.php', {
          method: 'POST',
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (!uploadData.success) {
          throw new Error(uploadData.error || 'Upload failed');
        }

        // Update profile with new picture
        const updateRes = await fetch('api/auth.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_profile',
            name: profileForm.name,
            email: profileForm.email,
            current_email: authUser.email,
            profile_picture: uploadData.url
          })
        });
        const updateData = await updateRes.json();
        if (updateData.success) {
          setProfilePicture(uploadData.url);
          setAuthUser(updateData.user);
          localStorage.setItem('authUser', JSON.stringify(updateData.user));
          setProfileMessage({
            type: 'success',
            text: 'Profile picture updated successfully!'
          });
        } else {
          throw new Error(updateData.error || 'Failed to update profile');
        }
      } catch (error) {
        setProfileMessage({
          type: 'error',
          text: error.message || 'Failed to upload picture'
        });
      } finally {
        setUploadingPicture(false);
        e.target.value = ''; // Reset input
      }
    },
    disabled: uploadingPicture
  }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-bold text-white"
  }, authUser.name), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-white/60"
  }, authUser.email), uploadingPicture && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-yellow-400 mt-1"
  }, "Uploading..."))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-white mb-4"
  }, "Profile Information"), /*#__PURE__*/React.createElement("form", {
    onSubmit: async e => {
      e.preventDefault();
      setUpdatingProfile(true);
      setProfileMessage(null);
      try {
        const res = await fetch('api/auth.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'update_profile',
            name: profileForm.name,
            email: profileForm.email,
            current_email: authUser.email
          })
        });
        const data = await res.json();
        if (data.success) {
          setAuthUser(data.user);
          localStorage.setItem('authUser', JSON.stringify(data.user));
          setProfileMessage({
            type: 'success',
            text: 'Profile updated successfully!'
          });
          setProfileForm({
            name: data.user.name || '',
            email: data.user.email || ''
          });
        } else {
          setProfileMessage({
            type: 'error',
            text: data.error || 'Failed to update profile'
          });
        }
      } catch (error) {
        setProfileMessage({
          type: 'error',
          text: 'Error updating profile. Please try again.'
        });
      } finally {
        setUpdatingProfile(false);
      }
    },
    className: "space-y-4"
  }, profileMessage && /*#__PURE__*/React.createElement("div", {
    className: `p-3 rounded-lg ${profileMessage.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`
  }, profileMessage.text), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-white/80 mb-2"
  }, "Full Name"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    value: profileForm.name,
    onChange: e => setProfileForm({
      ...profileForm,
      name: e.target.value
    }),
    className: "w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/50",
    required: true,
    disabled: updatingProfile
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-white/80 mb-2"
  }, "Email Address"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: profileForm.email,
    onChange: e => setProfileForm({
      ...profileForm,
      email: e.target.value
    }),
    className: "w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/50",
    required: true,
    disabled: updatingProfile
  })), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: updatingProfile || profileForm.name === authUser.name && profileForm.email === authUser.email,
    className: "px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-300 to-cyan-400 font-semibold text-slate-900 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  }, updatingProfile ? 'Updating...' : 'Update Profile')))), dashboardTab === 'settings' && /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-white mb-4"
  }, "Change Password"), /*#__PURE__*/React.createElement("form", {
    onSubmit: async e => {
      e.preventDefault();
      setChangingPassword(true);
      setSettingsMessage(null);
      if (settingsForm.newPassword !== settingsForm.confirmPassword) {
        setSettingsMessage({
          type: 'error',
          text: 'New passwords do not match'
        });
        setChangingPassword(false);
        return;
      }
      if (settingsForm.newPassword.length < 8) {
        setSettingsMessage({
          type: 'error',
          text: 'Password must be at least 8 characters'
        });
        setChangingPassword(false);
        return;
      }
      try {
        const res = await fetch('api/auth.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'change_password',
            email: authUser.email,
            currentPassword: settingsForm.currentPassword,
            newPassword: settingsForm.newPassword
          })
        });
        const data = await res.json();
        if (data.success) {
          setSettingsMessage({
            type: 'success',
            text: 'Password changed successfully!'
          });
          setSettingsForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          });
        } else {
          setSettingsMessage({
            type: 'error',
            text: data.error || 'Failed to change password'
          });
        }
      } catch (error) {
        setSettingsMessage({
          type: 'error',
          text: 'Error changing password. Please try again.'
        });
      } finally {
        setChangingPassword(false);
      }
    },
    className: "space-y-4"
  }, settingsMessage && /*#__PURE__*/React.createElement("div", {
    className: `p-3 rounded-lg ${settingsMessage.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-400' : 'bg-red-500/20 border border-red-500/30 text-red-400'}`
  }, settingsMessage.text), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-white/80 mb-2"
  }, "Current Password"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: settingsForm.currentPassword,
    onChange: e => setSettingsForm({
      ...settingsForm,
      currentPassword: e.target.value
    }),
    className: "w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/50",
    required: true,
    disabled: changingPassword
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-white/80 mb-2"
  }, "New Password"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: settingsForm.newPassword,
    onChange: e => setSettingsForm({
      ...settingsForm,
      newPassword: e.target.value
    }),
    className: "w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/50",
    placeholder: "Minimum 8 characters",
    required: true,
    disabled: changingPassword
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-sm font-medium text-white/80 mb-2"
  }, "Confirm New Password"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    value: settingsForm.confirmPassword,
    onChange: e => setSettingsForm({
      ...settingsForm,
      confirmPassword: e.target.value
    }),
    className: "w-full rounded-xl bg-slate-900/60 border border-white/10 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-cyan-400/50",
    required: true,
    disabled: changingPassword
  }), settingsForm.confirmPassword && settingsForm.newPassword !== settingsForm.confirmPassword && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-xs text-red-400"
  }, "Passwords do not match")), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: changingPassword || !settingsForm.currentPassword || !settingsForm.newPassword || settingsForm.newPassword !== settingsForm.confirmPassword,
    className: "px-6 py-3 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-300 to-cyan-400 font-semibold text-slate-900 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
  }, changingPassword ? 'Changing...' : 'Change Password'))), /*#__PURE__*/React.createElement("div", {
    className: "pt-6 border-t border-white/10"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-white mb-4"
  }, "Account Information"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-white/60"
  }, "Member Since"), /*#__PURE__*/React.createElement("p", {
    className: "text-white font-medium"
  }, new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-white/60"
  }, "Total Orders"), /*#__PURE__*/React.createElement("p", {
    className: "text-white font-medium"
  }, userSubmissions.filter(s => s.submission_type === 'order_form').length))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-white/60"
  }, "Account Status"), /*#__PURE__*/React.createElement("p", {
    className: "text-green-400 font-medium"
  }, "Active"))))), /*#__PURE__*/React.createElement("div", {
    className: "pt-6 border-t border-white/10"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-semibold text-white mb-4"
  }, "Account Actions"), /*#__PURE__*/React.createElement("button", {
    onClick: async () => {
      try {
        await fetch('api/auth.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'logout'
          })
        });
        localStorage.removeItem('authUser');
        setAuthUser(null);
        setUserSubmissions([]);
        setShowUserDashboard(false);
      } catch (e) {
        console.error('Logout error:', e);
        // Still clear local state
        localStorage.removeItem('authUser');
        setAuthUser(null);
        setUserSubmissions([]);
        setShowUserDashboard(false);
      }
    },
    className: "w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-300 transition-colors"
  }, /*#__PURE__*/React.createElement("svg", {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24"
  }, /*#__PURE__*/React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: 2,
    d: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
  })), "Logout")))))));
}

// Render the app - React 18 uses createRoot
// Wait for DOM and React to be ready
function renderApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    setTimeout(renderApp, 10);
    return;
  }

  // Check if React is loaded
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    setTimeout(renderApp, 10);
    return;
  }
  if (ReactDOM.createRoot) {
    // React 18+
    const root = ReactDOM.createRoot(rootElement);
    root.render(/*#__PURE__*/React.createElement(App, null));
  } else {
    // React 17 fallback
    ReactDOM.render(/*#__PURE__*/React.createElement(App, null), rootElement);
  }
}

// Start rendering - ensure it runs after all scripts are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(renderApp, 0));
} else {
  // Use setTimeout to ensure React/ReactDOM are fully initialized
  setTimeout(renderApp, 0);
}
