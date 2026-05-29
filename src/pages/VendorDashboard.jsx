import { useState, useEffect, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  LogOut, 
  Store, 
  LayoutDashboard, 
  Boxes, 
  ShoppingCart, 
  Receipt, 
  Award, 
  MessageSquare, 
  Plus, 
  Minus, 
  Bell, 
  TrendingUp, 
  DollarSign, 
  Truck, 
  ChevronRight,
  Send,
  Users,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Camera,
  Trash2
} from "lucide-react";
import gsap from "gsap";

export default function VendorDashboard() {
  const { currentUser, signOutUser } = useAuth();
  const navigate = useNavigate();

  // Authentication State Controls
  const [needsStoreSetup, setNeedsStoreSetup] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [localDisplayName, setLocalDisplayName] = useState(currentUser?.displayName || "");
  const [storeId, setStoreId] = useState(null);

  // Dashboard Workspace Navigation
  const [activeTab, setActiveTab] = useState("analytics"); // "analytics", "inventory", "distributor", "billing", "customer", "ai"
  const contentRef = useRef(null);

  // --- INTERACTIVE DATABASE STATES ---
  
  // Feature 1: Inventory List State
  const [inventory, setInventory] = useState([]);
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdStock, setNewProdStock] = useState("");
  const [newProdCategory, setNewProdCategory] = useState("Components");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdImages, setNewProdImages] = useState([]);
  const [expandedItemId, setExpandedItemId] = useState(null);

  // Feature 2: Distributor Inventory Catalog
  const distributorCatalog = [
    { id: 101, name: "Bulk Graphene Sheets (x50)", price: 450.00, supplier: "Apex Logistics" },
    { id: 102, name: "Helium Cooling Canisters (x10)", price: 120.00, supplier: "Polar Gas Nodes" },
    { id: 103, name: "Quantum Diodes Multipack (x100)", price: 350.00, supplier: "MicroTech Dist" }
  ];
  const [distributorOrders, setDistributorOrders] = useState([]);

  // Feature 6: Sales Duration filter
  const [salesDuration, setSalesDuration] = useState("monthly");

  // Feature 7: AI Billing Invoice State (Synced from Neon DB)
  const [invoicesList, setInvoicesList] = useState([]);
  const [taxAmount, setTaxAmount] = useState("");
  const [discountApplied, setDiscountApplied] = useState("");
  const [finalPayableAmount, setFinalPayableAmount] = useState("");
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Feature 8: Telegram Customer Messaging States (Neon DB Synced)
  const [telegramCustomers, setTelegramCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [custMessageText, setCustMessageText] = useState("");
  const [sendingCustMsg, setSendingCustMsg] = useState(false);

  // Feature 9: Logistics Delivery Information States (Neon DB Synced)
  const [deliveriesList, setDeliveriesList] = useState([]);
  const [updatingGpsId, setUpdatingGpsId] = useState(null);
  const [gpsInput, setGpsInput] = useState("");

  // Feature 10: Payment Transactions Ledger (Neon DB Synced)
  const [transactionsLedger, setTransactionsLedger] = useState([]);
  const [paymentGatewayLedger, setPaymentGatewayLedger] = useState([]);
  const [payingAmount, setPayingAmount] = useState("");
  const [payMethodInput, setPayMethodInput] = useState("UPI");
  const [payingState, setPayingState] = useState(false);

  // Feature 11: Telegram Vendor Communities (Neon DB Synced)
  const [communityGroupList, setCommunityGroupList] = useState([]);
  const [newTelegramId, setNewTelegramId] = useState("");
  const [newGroupId, setNewGroupId] = useState("GROUP_COLLECTIVE_01");
  const [newCommRole, setNewCommRole] = useState("Member");
  const [joiningComm, setJoiningComm] = useState(false);

  // Feature 13: AI Assistant Chatbot & Sessions (Neon DB Synced)
  const [chatHistory, setChatHistory] = useState([
    { role: "ai", text: "Greetings vendor! I am VerseAI, your logistics and commerce co-pilot. Ask me about restocking metrics, best-selling trends, or profit analysis!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatbotSessions, setChatbotSessions] = useState([]);

  // Feature 14: Distributor Live Auctions Arena (Neon DB Synced)
  const [dbAuctions, setDbAuctions] = useState([]);
  const [bidInputPrice, setBidInputPrice] = useState("");
  const [biddingAuctionId, setBiddingAuctionId] = useState(null);
  const [submittingBid, setSubmittingBid] = useState(false);

  // P&L real data from API
  const [plData, setPlData] = useState({ totalRevenue: 0, totalCost: 0, netProfit: 0, profitMargin: 0 });
  const [productPL, setProductPL] = useState([]);

  // Dynamic sales chart data
  const [chartData, setChartData] = useState({ labels: [], revenueData: [], ordersData: [] });

  // Cost price for new product creation
  const [newProdCostPrice, setNewProdCostPrice] = useState("");

  // Transaction recording (Record a Sale)
  const [saleProductId, setSaleProductId] = useState("");
  const [saleQuantity, setSaleQuantity] = useState("1");
  const [saleClientName, setSaleClientName] = useState("");
  const [saleMethod, setSaleMethod] = useState("Credit Node");
  const [recordingSale, setRecordingSale] = useState(false);

  // Product editing
  const [editingProductId, setEditingProductId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // --- ACTIONS & HANDLERS ---

  // Detect Google log-in store configuration triggers
  useEffect(() => {
    if (currentUser) {
      const isGoogle = currentUser.providerData?.some(p => p.providerId === "google.com");
      const isConfigured = localStorage.getItem(`store_configured_${currentUser.uid}`) === "true";
      
      if (isGoogle && !isConfigured) {
        setNeedsStoreSetup(true);
      } else {
        setLocalDisplayName(currentUser.displayName || "");
      }
    }
  }, [currentUser]);

  // Tab switching fade animations
  useEffect(() => {
    gsap.fromTo(contentRef.current,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );
  }, [activeTab]);

  // Fetch store_id based on store name displayName (self-healing registration fallback)
  useEffect(() => {
    const resolveStoreId = async () => {
      if (!localDisplayName) return;
      try {
        const res = await fetch(`/api/stores/search?name=${encodeURIComponent(localDisplayName)}`);
        if (res.ok) {
          const storeData = await res.json();
          setStoreId(storeData.store_id);
        } else {
          console.warn(`⚠ Store "${localDisplayName}" not registered in DB. Establishing now...`);
          const regRes = await fetch("/api/stores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storeName: localDisplayName })
          });
          if (regRes.ok) {
            const regData = await regRes.json();
            setStoreId(regData.store.store_id);
          }
        }
      } catch (error) {
        console.error("❌ Failed to resolve store_id:", error);
      }
    };
    resolveStoreId();
  }, [localDisplayName]);

  // Fetch database products, transactions, and distributor orders scoped by storeId
  useEffect(() => {
    if (!storeId) return;

    const fetchDatabaseValues = async () => {
      try {
        const prodRes = await fetch(`/api/products?storeId=${storeId}`);
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setInventory(prodData);
        }

        const txRes = await fetch(`/api/transactions?storeId=${storeId}`);
        if (txRes.ok) {
          const txData = await txRes.json();
          setTransactionsLedger(txData);
        }

        const orderRes = await fetch(`/api/distributor-orders?storeId=${storeId}`);
        if (orderRes.ok) {
          const orderData = await orderRes.json();
          setDistributorOrders(orderData);
        }

        const invoiceRes = await fetch(`/api/invoices?storeId=${storeId}`);
        if (invoiceRes.ok) {
          const invoiceData = await invoiceRes.json();
          setInvoicesList(invoiceData);
        }

        const customerRes = await fetch(`/api/telegram-customers?storeId=${storeId}`);
        if (customerRes.ok) {
          const customerData = await customerRes.json();
          setTelegramCustomers(customerData);
          if (customerData.length > 0) {
            setSelectedCustomerId(customerData[0].customer_id);
          }
        }

        const deliveryRes = await fetch(`/api/deliveries?storeId=${storeId}`);
        if (deliveryRes.ok) {
          const deliveryData = await deliveryRes.json();
          setDeliveriesList(deliveryData);
        }

        const payGatewayRes = await fetch(`/api/payment-transactions?storeId=${storeId}`);
        if (payGatewayRes.ok) {
          const payGatewayData = await payGatewayRes.json();
          setPaymentGatewayLedger(payGatewayData);
        }

        const communityRes = await fetch(`/api/telegram-communities?storeId=${storeId}`);
        if (communityRes.ok) {
          const communityData = await communityRes.json();
          setCommunityGroupList(communityData);
        }

        const chatSessRes = await fetch(`/api/chatbot-sessions?storeId=${storeId}`);
        if (chatSessRes.ok) {
          const chatSessData = await chatSessRes.json();
          setChatbotSessions(chatSessData);
        }

        const auctionRes = await fetch('/api/auctions');
        if (auctionRes.ok) {
          const auctionData = await auctionRes.json();
          setDbAuctions(auctionData);
        }
      } catch (error) {
        console.error("❌ Failed to fetch database synchronized records:", error);
      }
    };
    fetchDatabaseValues();
  }, [storeId]);

  // Fetch P&L and chart data whenever storeId or salesDuration changes
  useEffect(() => {
    if (!storeId) return;
    const fetchPLAndChart = async () => {
      try {
        const plRes = await fetch(`/api/profit-loss/${storeId}`);
        if (plRes.ok) { setPlData(await plRes.json()); }

        const ppRes = await fetch(`/api/profit-loss/${storeId}/products`);
        if (ppRes.ok) { setProductPL(await ppRes.json()); }

        const chartRes = await fetch(`/api/sales-reports/dynamic/${storeId}?range=${salesDuration}`);
        if (chartRes.ok) { setChartData(await chartRes.json()); }
      } catch (error) {
        console.error("Failed to fetch P&L/chart data:", error);
      }
    };
    fetchPLAndChart();
  }, [storeId, salesDuration]);

  // Sign out workflow
  const handleSignOut = async () => {
    try {
      await signOutUser();
      navigate("/vendor-auth");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  // Google vendor setup form submit
  const handleStoreSetupSubmit = async (e) => {
    e.preventDefault();
    if (!storeNameInput.trim()) return;
    if (storeNameInput.trim().length < 2) {
      alert("Store name must be at least 2 characters!");
      return;
    }
    try {
      setSetupLoading(true);

      // Register securely in local DB server
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeName: storeNameInput.trim() })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to register store.");
      }

      const resData = await res.json();
      const { updateProfile } = await import("firebase/auth");
      await updateProfile(currentUser, { displayName: storeNameInput.trim() });
      localStorage.setItem(`store_configured_${currentUser.uid}`, "true");
      setStoreId(resData.store.store_id);
      setLocalDisplayName(storeNameInput.trim());
      setNeedsStoreSetup(false);
    } catch (error) {
      console.error("Failed to setup store name:", error);
      alert(error.message || "Failed to establish store connection.");
    } finally {
      setSetupLoading(false);
    }
  };

  // Feature 1: Create Product securely in Neon PostgreSQL (scoped by storeId)
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!storeId || !newProdName.trim() || !newProdPrice || !newProdStock) return;
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name: newProdName.trim(),
          price: parseFloat(newProdPrice),
          stock: parseInt(newProdStock),
          category: newProdCategory,
          description: newProdDescription.trim(),
          images: newProdImages,
          cost_price: parseFloat(newProdCostPrice) || 0
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create product in database.");
      }

      const createdProduct = await res.json();
      setInventory((prev) => [...prev, createdProduct]);

      setNewProdName("");
      setNewProdPrice("");
      setNewProdStock("");
      setNewProdDescription("");
      setNewProdImages([]);
      setNewProdCostPrice("");
      setActiveTab("inventory");
    } catch (error) {
      console.error("❌ Error registering product:", error);
      alert(error.message || "Failed to persist product in database.");
    }
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const availableSlots = 5 - newProdImages.length;
    if (availableSlots <= 0) {
      alert("You can upload a maximum of 5 photos.");
      return;
    }

    const filesToProcess = files.slice(0, availableSlots);
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProdImages((prev) => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeUploadedImage = (index) => {
    setNewProdImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Feature 1: Increment/Decrement Stock Levels in PostgreSQL
  const updateStockLevel = async (id, delta) => {
    try {
      const res = await fetch(`/api/products/${id}/stock`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta })
      });

      if (!res.ok) throw new Error("Failed to update stock level in database.");

      const updatedProduct = await res.json();
      setInventory((prev) =>
        prev.map((item) => (item.id === id ? updatedProduct : item))
      );
    } catch (error) {
      console.error("❌ Stock sync error:", error);
      alert("Failed to synchronize stock update with database.");
    }
  };

  // Feature 2: Securely order items from Distributor & log in DB (scoped by storeId)
  const placeDistributorOrder = async (item) => {
    if (!storeId) return;
    try {
      const res = await fetch("/api/distributor-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          item: item.name,
          cost: item.price,
          supplier: item.supplier
        })
      });

      if (!res.ok) throw new Error("Failed to record distributor order.");

      const createdOrder = await res.json();
      setDistributorOrders((prev) => [...prev, createdOrder]);

      // Automatically replenish corresponding items inside inventory database table
      const matchingProduct = inventory.find(i => 
        i.name.toLowerCase().includes("diode") && item.name.toLowerCase().includes("diode")
      );
      if (matchingProduct) {
        await updateStockLevel(matchingProduct.id, 100);
      } else {
        alert(`Order secured! 10x Helium Canisters added to delivery log.`);
      }
    } catch (error) {
      console.error("❌ Distributor order sync error:", error);
      alert("Failed to persist distributor order in database.");
    }
  };

  // Feature 7: Submit Invoice & Trigger Live AI Auditing Probe
  const handleSubmitInvoice = async (e) => {
    e.preventDefault();
    if (!storeId || !finalPayableAmount) return;
    try {
      setSubmittingInvoice(true);
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          taxAmount: parseFloat(taxAmount || 0),
          discountApplied: parseFloat(discountApplied || 0),
          finalPayableAmount: parseFloat(finalPayableAmount)
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to submit invoice.");
      }

      const auditedInvoice = await res.json();
      setInvoicesList((prev) => [auditedInvoice, ...prev]);

      setTaxAmount("");
      setDiscountApplied("");
      setFinalPayableAmount("");
    } catch (error) {
      console.error("❌ Invoice audit failure:", error);
      alert(error.message || "Failed to audit invoice.");
    } finally {
      setSubmittingInvoice(false);
    }
  };

  // Feature 8: Send messages directly to selected Telegram customer via backend API
  const handleSendTelegramCustomer = async (e) => {
    e.preventDefault();
    if (!storeId || !selectedCustomerId || !custMessageText.trim()) return;
    try {
      setSendingCustMsg(true);
      const res = await fetch("/api/telegram-customers/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          customerId: parseInt(selectedCustomerId),
          messageText: custMessageText.trim()
        })
      });

      if (!res.ok) throw new Error("Failed to broadcast telegram message.");

      const updatedCustomer = await res.json();
      setTelegramCustomers((prev) =>
        prev.map((c) => (c.customer_id === updatedCustomer.customer_id ? updatedCustomer : c))
      );
      setCustMessageText("");
      alert(`Broadcast Dispatched! Status: ${updatedCustomer.message_delivery_status}`);
    } catch (error) {
      console.error("❌ Telegram broadcast failure:", error);
      alert("Failed to stream message broadcast to backend.");
    } finally {
      setSendingCustMsg(false);
    }
  };

  // Feature 9: Logistics GPS coordinate updates simulation
  const handleUpdateDeliveryGps = async (deliveryId, coordinates) => {
    try {
      const res = await fetch(`/api/deliveries/${deliveryId}/gps`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coordinates })
      });

      if (!res.ok) throw new Error("Failed to update GPS coordinates.");

      const updatedDelivery = await res.json();
      setDeliveriesList((prev) =>
        prev.map((d) => (d.delivery_id === updatedDelivery.delivery_id ? { ...d, current_gps_coordinates: updatedDelivery.current_gps_coordinates } : d))
      );
    } catch (error) {
      console.error("❌ GPS sync error:", error);
      alert("Failed to synchronize coordinates with Neon.");
    }
  };

  // Feature 10: Checkout simulated Gateway Payments Auditor
  const handleProcessGatewayPayment = async (e) => {
    e.preventDefault();
    if (!storeId || !payingAmount) return;
    try {
      setPayingState(true);
      const simulatedPayload = {
        gateway: "Razorpay-Commerce",
        payment_id: "pay_" + Math.random().toString(36).substring(2, 9),
        client_name: currentUser?.email || "Unknown Client",
        browser_agent: navigator.userAgent
      };

      const res = await fetch("/api/payment-transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          method: payMethodInput,
          status: "Success",
          payload: simulatedPayload,
          amount: parseFloat(payingAmount)
        })
      });

      if (!res.ok) throw new Error("Failed to process payment transaction.");

      const payData = await res.json();
      setPaymentGatewayLedger((prev) => [payData, ...prev]);
      setPayingAmount("");
      alert("Checkout Successful! Audited Gateway Receipt generated on Neon.");
    } catch (error) {
      console.error("❌ Gateway check failed:", error);
      alert("Failed to authenticate payment with gateway server.");
    } finally {
      setPayingState(false);
    }
  };

  // Feature 11: Telegram Vendor Communities Joining and Role Updates
  const handleJoinCommunity = async (e) => {
    e.preventDefault();
    if (!storeId || !newTelegramId.trim()) return;
    try {
      setJoiningComm(true);
      const res = await fetch("/api/telegram-communities/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          telegramId: newTelegramId.trim(),
          groupId: newGroupId,
          role: newCommRole
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to register connection.");
      }

      const joinedListing = await res.json();
      setCommunityGroupList((prev) => [...prev, joinedListing]);
      setNewTelegramId("");
    } catch (error) {
      console.error("❌ Join community error:", error);
      alert(error.message || "Failed to connect vendor to Telegram group.");
    } finally {
      setJoiningComm(false);
    }
  };

  const handleUpdateCommunityRole = async (telegramId, role, banStatus) => {
    if (!storeId) return;
    try {
      const res = await fetch("/api/telegram-communities/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          telegramId,
          role,
          banStatus
        })
      });

      if (!res.ok) throw new Error("Failed to moderate community roles.");

      const updatedMember = await res.json();
      setCommunityGroupList((prev) =>
        prev.map((m) => (m.vendor_telegram_id === updatedMember.vendor_telegram_id ? updatedMember : m))
      );
    } catch (error) {
      console.error("❌ Community role edit failure:", error);
      alert("Failed to synchronize moderator updates with Neon.");
    }
  };

  // Feature 13: Chatbot Message submit — powered by Google Gemini AI
  const [chatLoading, setChatLoading] = useState(false);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !storeId || chatLoading) return;

    const userMsgText = chatInput.trim();
    setChatInput("");
    setChatHistory((prev) => [...prev, { role: "user", text: userMsgText }]);
    setChatLoading(true);

    // Build history for multi-turn context (exclude the initial greeting)
    const historyForApi = chatHistory.filter((m) => m.text !== chatHistory[0]?.text || chatHistory.indexOf(m) !== 0);

    try {
      // Call the server-side Gemini endpoint with real store context
      const chatRes = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          storeName: localDisplayName,
          userMessage: userMsgText,
          chatHistory: historyForApi
        })
      });

      let replyText;
      if (chatRes.ok) {
        const chatData = await chatRes.json();
        replyText = chatData.reply;
      } else {
        const errData = await chatRes.json().catch(() => ({}));
        replyText = `I encountered an issue reaching my AI core. ${errData.error || "Please try again shortly."}`;
      }

      // Log the session to the database
      let sessionId = null;
      try {
        const logRes = await fetch("/api/chatbot-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId,
            queryText: userMsgText,
            responseText: replyText
          })
        });
        if (logRes.ok) {
          const loggedSession = await logRes.json();
          sessionId = loggedSession.session_id;
          setChatbotSessions((prev) => [loggedSession, ...prev]);
        }
      } catch (logErr) {
        console.warn("⚠ Session logging failed (non-critical):", logErr);
      }

      setChatHistory((prev) => [...prev, { role: "ai", text: replyText, session_id: sessionId }]);
    } catch (error) {
      console.error("❌ Chat request failed:", error);
      setChatHistory((prev) => [
        ...prev,
        { role: "ai", text: "Connection error. Please check your network and try again." }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleRateChatbotSession = async (sessionId, rating) => {
    try {
      const res = await fetch(`/api/chatbot-sessions/${sessionId}/rate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: parseInt(rating) })
      });

      if (!res.ok) throw new Error("Failed to save session rating.");

      const updatedSession = await res.json();
      setChatbotSessions((prev) =>
        prev.map((s) => (s.session_id === updatedSession.session_id ? updatedSession : s))
      );
      alert(`Thank you! rated ${rating}/5 stars.`);
    } catch (error) {
      console.error("❌ Session rating failed:", error);
      alert("Failed to submit chatbot rating.");
    }
  };

  // Feature 14: Auction Bid placement wired to live auctions table in Neon
  const handlePlaceDbAuctionBid = async (auctionId, bidAmountStr) => {
    const amount = parseFloat(bidAmountStr);
    if (isNaN(amount) || !storeId) return;
    try {
      setSubmittingBid(true);
      const res = await fetch(`/api/auctions/${auctionId}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          bidAmount: amount
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to place auction bid.");
      }

      const updatedAuction = await res.json();
      // Re-hydrate auctions from backend
      const aucRes = await fetch('/api/auctions');
      if (aucRes.ok) {
        const auctionData = await aucRes.json();
        setDbAuctions(auctionData);
      }
      setBidInputPrice("");
      alert("Bid Placed! You are now the current highest bidder.");
    } catch (error) {
      console.error("❌ Auction bid failure:", error);
      alert(error.message || "Failed to submit live auction bid.");
    } finally {
      setSubmittingBid(false);
    }
  };

  // Product update handler
  const handleUpdateProduct = async (productId) => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, ...editForm })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const updated = await res.json();
      setInventory(prev => prev.map(p => p.product_id === productId ? { ...p, ...updated } : p));
      setEditingProductId(null);
      setEditForm({});
    } catch (error) {
      alert(error.message || "Failed to update product.");
    }
  };

  // Product delete handler
  const handleDeleteProduct = async (productId) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${productId}?storeId=${storeId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      // Remove from local inventory state
      setInventory(prev => prev.filter(p => p.product_id !== productId));
      // Also refresh P&L breakdown to remove deleted product
      const ppRes = await fetch(`/api/profit-loss/${storeId}/products`);
      if (ppRes.ok) setProductPL(await ppRes.json());
    } catch (error) {
      alert(error.message || "Failed to delete product.");
    }
  };

  // Record a sale transaction
  const handleRecordSale = async (e) => {
    e.preventDefault();
    if (!saleProductId || !saleQuantity || !saleClientName.trim()) return;
    setRecordingSale(true);
    try {
      const res = await fetch("/api/transactions/sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          productId: parseInt(saleProductId),
          quantity: parseInt(saleQuantity),
          clientName: saleClientName.trim(),
          method: saleMethod
        })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      const newTx = await res.json();
      setTransactionsLedger(prev => [newTx, ...prev]);
      // Refresh P&L and chart
      const plRes = await fetch(`/api/profit-loss/${storeId}`);
      if (plRes.ok) setPlData(await plRes.json());
      const ppRes = await fetch(`/api/profit-loss/${storeId}/products`);
      if (ppRes.ok) setProductPL(await ppRes.json());
      const chartRes = await fetch(`/api/sales-reports/dynamic/${storeId}?range=${salesDuration}`);
      if (chartRes.ok) setChartData(await chartRes.json());
      // Refresh inventory (stock changed)
      const prodRes = await fetch(`/api/products?storeId=${storeId}`);
      if (prodRes.ok) setInventory(await prodRes.json());
      // Reset form
      setSaleProductId("");
      setSaleQuantity("1");
      setSaleClientName("");
    } catch (error) {
      alert(error.message || "Failed to record sale.");
    } finally {
      setRecordingSale(false);
    }
  };

  // Profit/Loss formulas (computed from real Neon DB data)
  const calculateTotalSales = () => plData.totalRevenue;
  const calculateTotalCosts = () => plData.totalCost;
  const calculateProfit = () => plData.netProfit;

  // Helper arrays for alerts (Feature 3)
  const lowStockItems = inventory.filter(i => i.stock <= 5);

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-6 relative py-12 text-slate-800">
      
      {needsStoreSetup ? (
        /* Establish Store Card (Google Logins) */
        <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 p-10 md:p-12 rounded-3xl text-center max-w-md w-full shadow-xl relative z-10 transition-all duration-300">
          <form onSubmit={handleStoreSetupSubmit} className="flex flex-col">
            <div className="w-16 h-16 bg-cyan-50 border border-cyan-200 rounded-full flex items-center justify-center mx-auto mb-6 text-cyan-600 shadow-sm animate-pulse">
              <Store size={28} />
            </div>

            <h1 className="font-display font-black text-3xl mb-2 text-slate-900 uppercase tracking-tight">
              Establish Store
            </h1>
            <p className="text-slate-500 text-xs mb-8 font-medium leading-relaxed">
              We connected via Google, but your store is not yet established. Enter a store name to initialize your node.
            </p>

            <div className="relative mb-6 text-left">
              <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-1 block mb-1.5">
                Store Name
              </label>
              <div className="relative">
                <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  value={storeNameInput}
                  onChange={(e) => setStoreNameInput(e.target.value)}
                  placeholder="My Custom Store" 
                  className="w-full pl-11 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={setupLoading}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 hover:shadow-neonCyan hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {setupLoading ? "Establishing..." : "Establish Store Node"}
            </button>

            <button 
              type="button"
              onClick={handleSignOut}
              className="w-full mt-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-display font-bold text-[10px] tracking-wider uppercase rounded-xl transition-all duration-300"
            >
              Cancel & Sign Out
            </button>
          </form>
        </div>
      ) : (
        /* Futuristic Full-Feature Vendor Dashboard Layout */
        <div className="w-full max-w-6xl bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl shadow-2xl relative z-10 transition-all duration-300 overflow-hidden flex flex-col md:flex-row min-h-[750px]">
          
          {/* SIDEBAR TABS CONTROLLER */}
          <aside className="w-full md:w-64 bg-slate-50/80 border-b md:border-b-0 md:border-r border-slate-200/60 p-6 flex flex-col justify-between shrink-0">
            <div className="flex flex-col gap-6">
              
              {/* Sidebar Header */}
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 bg-cyan-50 border border-cyan-200 rounded-xl flex items-center justify-center text-cyan-600 shadow-sm">
                  <Store size={20} />
                </div>
                <div className="overflow-hidden">
                  <h2 className="font-display font-black text-sm tracking-tight text-slate-900 truncate uppercase">
                    {localDisplayName || "Vendor Store"}
                  </h2>
                  <p className="text-[9px] text-slate-400 font-display font-bold uppercase tracking-wider truncate">
                    Vendor Workspace
                  </p>
                </div>
              </div>

              {/* Sidebar Navigation */}
              <nav className="flex flex-col gap-1.5">
                <button
                  onClick={() => setActiveTab("analytics")}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "analytics"
                      ? "bg-white text-cyan-600 shadow-sm border border-slate-200/30"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  <LayoutDashboard size={15} />
                  Analytics Deck
                </button>

                <button
                  onClick={() => setActiveTab("inventory")}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "inventory"
                      ? "bg-white text-cyan-600 shadow-sm border border-slate-200/30"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  <Boxes size={15} />
                  Inventory Node
                </button>

                <button
                  onClick={() => setActiveTab("create-product")}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "create-product"
                      ? "bg-white text-cyan-600 shadow-sm border border-slate-200/30"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  <Plus size={15} />
                  Create Product
                </button>



                <button
                  onClick={() => setActiveTab("telegram-customers")}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "telegram-customers"
                      ? "bg-white text-cyan-600 shadow-sm border border-slate-200/30"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  <Users size={15} />
                  Customer Message
                </button>

                <button
                  onClick={() => setActiveTab("ai")}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all duration-300 ${
                    activeTab === "ai"
                      ? "bg-white text-cyan-600 shadow-sm border border-slate-200/30"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                  }`}
                >
                  <MessageSquare size={15} />
                  AI Chat Co-pilot
                </button>
              </nav>
            </div>

            {/* Logout Trigger */}
            <div className="mt-8">
              <div className="bg-slate-200/40 border border-slate-200/60 rounded-2xl p-4 mb-4 select-none">
                <p className="text-[8px] text-slate-400 font-display font-extrabold uppercase tracking-widest mb-0.5">
                  Connection Node
                </p>
                <p className="text-[10px] font-semibold text-slate-600 truncate break-all select-all">
                  {currentUser?.email}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full py-3 border border-slate-200 hover:bg-red-50 text-slate-500 hover:text-red-600 font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          </aside>

          {/* MAIN PANELS CONTAINER */}
          <main ref={contentRef} className="flex-1 p-8 md:p-10 flex flex-col justify-between overflow-y-auto">
            
            {/* FEATURE TAB PANELS */}
            <div className="w-full flex-grow flex flex-col justify-between">
              
              {/* Feature 3: Top-level AI Alerts banner */}
              {lowStockItems.length > 0 && (
                <div className="mb-8 flex items-center justify-between gap-4 bg-amber-50/90 border border-amber-200 rounded-2xl p-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                    <div className="text-left">
                      <p className="text-[10px] font-display font-extrabold uppercase tracking-widest text-amber-800">
                        AI Restocking Assist Alert
                      </p>
                      <p className="text-xs font-semibold text-amber-700">
                        {lowStockItems.map(i => `${i.name} (${i.stock} left)`).join(", ")} below minimum threshold.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("distributor")}
                    className="text-[9px] font-display font-extrabold uppercase tracking-wider text-cyan-600 hover:text-cyan-800 flex items-center gap-0.5"
                  >
                    Resolve Node <ChevronRight size={10} />
                  </button>
                </div>
              )}

              {/* 📊 TAB 1: ANALYTICS DECK (Features 5, 6, 10) */}
              {activeTab === "analytics" && (
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h1 className="font-display font-black text-2xl tracking-tight text-slate-900 uppercase">
                        Analytics Deck
                      </h1>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Overview of active financial nodes and payments registers
                      </p>
                    </div>
                    {/* Feature 6: sales filters */}
                    <div className="flex p-0.5 bg-slate-50 border border-slate-100 rounded-xl">
                      {["weekly", "monthly", "yearly"].map((t) => (
                        <button
                          key={t}
                          onClick={() => setSalesDuration(t)}
                          className={`px-3 py-1.5 text-[9px] font-display font-bold uppercase tracking-wider rounded-lg transition-all ${
                            salesDuration === t
                              ? "bg-white text-cyan-600 shadow-sm border border-slate-200/20"
                              : "text-slate-400 hover:text-slate-600"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Feature 5: Profit & Loss tracking cockpit */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left relative overflow-hidden">
                      <div className="absolute top-4 right-4 text-cyan-600">
                        <TrendingUp size={18} />
                      </div>
                      <p className="text-[10px] text-slate-400 font-display font-extrabold uppercase tracking-widest mb-1">
                        Gross Revenue
                      </p>
                      <p className="text-2xl font-display font-black text-slate-950">
                        ${calculateTotalSales().toFixed(2)}
                      </p>
                      <p className="text-[9px] font-semibold text-green-600 mt-2 flex items-center gap-1">
                        <span>↑ +12.4%</span>
                        <span className="text-slate-400 font-normal">vs previous cycle</span>
                      </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left relative overflow-hidden">
                      <div className="absolute top-4 right-4 text-rose-600">
                        <Minus size={18} />
                      </div>
                      <p className="text-[10px] text-slate-400 font-display font-extrabold uppercase tracking-widest mb-1">
                        Operating Costs
                      </p>
                      <p className="text-2xl font-display font-black text-slate-950">
                        ${calculateTotalCosts().toFixed(2)}
                      </p>
                      <p className="text-[9px] font-semibold text-slate-400 mt-2">
                        Includes distributor orders
                      </p>
                    </div>

                    <div className="bg-cyan-50/30 border border-cyan-100 rounded-2xl p-6 text-left relative overflow-hidden">
                      <div className="absolute top-4 right-4 text-cyan-600">
                        <DollarSign size={18} />
                      </div>
                      <p className="text-[10px] text-cyan-600 font-display font-extrabold uppercase tracking-widest mb-1">
                        Net Profit (P&L)
                      </p>
                      <p className="text-2xl font-display font-black text-slate-950">
                        ${calculateProfit().toFixed(2)}
                      </p>
                      <p className="text-[9px] font-semibold text-cyan-700 mt-2">
                        Margin: {plData.profitMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* Feature 6: Visual Report representation */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left">
                    <h3 className="font-display font-extrabold text-[10px] uppercase tracking-widest text-slate-400 mb-6">
                      Sales Trend Indicator ({salesDuration})
                    </h3>
                    <div className="h-32 flex items-end justify-between gap-3 px-2 border-b border-slate-200 pb-2">
                      {chartData.revenueData.length > 0 ? (
                        chartData.revenueData.map((val, idx) => {
                          const maxVal = Math.max(...chartData.revenueData, 1);
                          const heightPct = (val / maxVal) * 100;
                          const isPeak = val === maxVal;
                          return (
                            <div key={idx} className={`flex-1 ${isPeak ? 'bg-cyan-500' : 'bg-cyan-100 border-t border-cyan-400'} rounded-t relative group`}
                              style={{ height: `${Math.max(heightPct, 4)}%` }}>
                              <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-bold py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                ${val.toFixed(0)}{isPeak ? ' (Peak)' : ''}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">No sales data for this period</div>
                      )}
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-display font-bold uppercase tracking-wider mt-3 px-1">
                      {chartData.labels.length > 0 ? (
                        chartData.labels.map((label, idx) => <span key={idx}>{label}</span>)
                      ) : (
                        <span>No data</span>
                      )}
                    </div>
                  </div>

                  {/* Feature 10: Payment Transactions Ledger (Full Width) */}
                  <div className="flex flex-col gap-4 text-left">
                    <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400">
                      Payment Transaction Ledgers
                    </h3>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-display text-[9px] font-extrabold tracking-widest">
                            <th className="py-4 px-6 text-left">Tx Code</th>
                            <th className="py-4 px-6 text-left">Client Entity</th>
                            <th className="py-4 px-6 text-left">Product</th>
                            <th className="py-4 px-6 text-left">Payment Node</th>
                            <th className="py-4 px-6 text-right">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 font-semibold text-slate-700 font-sans">
                          {transactionsLedger.map((tx) => (
                            <tr key={tx.id} className="hover:bg-white/40 transition-colors">
                              <td className="py-4 px-6 text-slate-500 font-mono">{tx.id}</td>
                              <td className="py-4 px-6 text-slate-900">{tx.client}</td>
                              <td className="py-4 px-6 text-slate-600">{tx.product_name || "N/A"}</td>
                              <td className="py-4 px-6 text-[10px] text-slate-500 font-display font-bold uppercase tracking-wider">{tx.method}</td>
                              <td className="py-4 px-6 text-right text-slate-950">${tx.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Record a Sale Transaction */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left">
                    <h3 className="font-display font-extrabold text-[10px] uppercase tracking-widest text-slate-400 mb-6">
                      Record a Sale
                    </h3>
                    <form onSubmit={handleRecordSale} className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">Product</label>
                          <select value={saleProductId} onChange={e => setSaleProductId(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" required>
                            <option value="">Select product...</option>
                            {inventory.filter(p => p.stock > 0).map(p => (
                              <option key={p.product_id} value={p.product_id}>{p.name} (${p.price} × {p.stock} avail)</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">Quantity</label>
                          <input type="number" min="1" value={saleQuantity} onChange={e => setSaleQuantity(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" required />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">Client Name</label>
                          <input type="text" value={saleClientName} onChange={e => setSaleClientName(e.target.value)} placeholder="Customer name" className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" required />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">Payment Method</label>
                          <select value={saleMethod} onChange={e => setSaleMethod(e.target.value)} className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500">
                            <option value="Credit Node">Credit Node</option>
                            <option value="Direct Bank">Direct Bank</option>
                            <option value="Merchant Pay">Merchant Pay</option>
                            <option value="UPI">UPI</option>
                            <option value="Cash">Cash</option>
                          </select>
                        </div>
                      </div>
                      <button type="submit" disabled={recordingSale} className="w-full py-3 bg-slate-900 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all hover:bg-cyan-600 hover:shadow-neonCyan hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                        <DollarSign size={14} /> {recordingSale ? "Recording..." : "Record Sale Transaction"}
                      </button>
                    </form>
                  </div>

                  {/* Per-Product Profit & Loss Breakdown */}
                  <div className="flex flex-col gap-4 text-left">
                    <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400">
                      Product-Level P&L Breakdown
                    </h3>
                    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 overflow-x-auto">
                      <table className="w-full text-xs min-w-[800px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-display text-[9px] font-extrabold tracking-widest">
                            <th className="py-4 px-4 text-left">Product</th>
                            <th className="py-4 px-3 text-right">Sell Price/Unit</th>
                            <th className="py-4 px-3 text-right">Buy Price/Unit</th>
                            <th className="py-4 px-3 text-right">Profit/Unit</th>
                            <th className="py-4 px-3 text-right">Margin/Unit</th>
                            <th className="py-4 px-3 text-right">Units Sold</th>
                            <th className="py-4 px-3 text-right">Revenue</th>
                            <th className="py-4 px-3 text-right">Cost</th>
                            <th className="py-4 px-3 text-right">Profit</th>
                            <th className="py-4 px-4 text-right">Margin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/50 font-semibold text-slate-700 font-sans">
                          {productPL.map(pp => (
                            <tr key={pp.product_id} className="hover:bg-white/40 transition-colors">
                              <td className="py-3 px-4 text-slate-900">{pp.product_name}</td>
                              <td className="py-3 px-3 text-right text-blue-700">${pp.unit_price?.toFixed(2) || '0.00'}</td>
                              <td className="py-3 px-3 text-right text-orange-600">${pp.cost_price?.toFixed(2) || '0.00'}</td>
                              <td className="py-3 px-3 text-right text-emerald-700">${pp.profit_per_unit?.toFixed(2) || '0.00'}</td>
                              <td className="py-3 px-3 text-right">
                                <span className={`text-[10px] font-display font-bold px-2 py-0.5 rounded-lg ${(pp.margin_per_unit || 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {(pp.margin_per_unit || 0).toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right text-slate-600">{pp.unitsSold}</td>
                              <td className="py-3 px-3 text-right text-green-700">${pp.revenue.toFixed(2)}</td>
                              <td className="py-3 px-3 text-right text-rose-600">${pp.cost.toFixed(2)}</td>
                              <td className="py-3 px-3 text-right text-slate-950">${pp.profit.toFixed(2)}</td>
                              <td className="py-3 px-4 text-right">
                                <span className={`text-[10px] font-display font-bold px-2 py-0.5 rounded-lg ${pp.profitMargin >= 0 ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
                                  {pp.profitMargin.toFixed(1)}%
                                </span>
                              </td>
                            </tr>
                          ))}
                          {productPL.length === 0 && (
                            <tr><td colSpan="10" className="py-6 text-center text-slate-400 text-xs">No products found. Add products to see P&L breakdown.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* ➕ TAB: CREATE PRODUCT */}
              {activeTab === "create-product" && (
                <div className="flex flex-col gap-8">
                  <div>
                    <h1 className="font-display font-black text-2xl tracking-tight text-slate-900 uppercase">
                      Create Product
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Register a new product in the store database
                    </p>
                  </div>

                  <div className="max-w-xl bg-slate-50 border border-slate-100 rounded-2xl p-8 text-left shadow-sm">
                    <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400 mb-6">
                      Product Information Node
                    </h3>
                    <form onSubmit={handleAddProduct} className="flex flex-col gap-6">
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                          Product Name
                        </label>
                        <input 
                          type="text" 
                          value={newProdName}
                          onChange={(e) => setNewProdName(e.target.value)}
                          placeholder="e.g. Laser Optic Lens"
                          className="px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-6">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                            Price ($)
                          </label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={newProdPrice}
                            onChange={(e) => setNewProdPrice(e.target.value)}
                            placeholder="29.99"
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                            Stock Quantity
                          </label>
                          <input 
                            type="number" 
                            value={newProdStock}
                            onChange={(e) => setNewProdStock(e.target.value)}
                            placeholder="20"
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                            required
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                            Cost Price ($)
                          </label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={newProdCostPrice}
                            onChange={(e) => setNewProdCostPrice(e.target.value)}
                            placeholder="15.00"
                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                          Category Node
                        </label>
                        <select 
                          value={newProdCategory}
                          onChange={(e) => setNewProdCategory(e.target.value)}
                          className="px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                        >
                          <option value="Processors">Processors</option>
                          <option value="Hardware">Hardware</option>
                          <option value="Coils">Coils</option>
                          <option value="Components">Components</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                          Product Description
                        </label>
                        <textarea 
                          value={newProdDescription}
                          onChange={(e) => setNewProdDescription(e.target.value)}
                          placeholder="Provide a detailed description of the quantum specifications, utility, and maintenance details..."
                          rows="3"
                          className="px-4 py-3.5 bg-white border border-slate-200 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none font-sans"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center ml-0.5">
                          <label className="text-[10px] font-display font-extrabold tracking-widest text-slate-400 uppercase">
                            Product Photos (Up to 5)
                          </label>
                          <span className="text-[9px] font-display font-bold uppercase tracking-wider text-slate-400">
                            {newProdImages.length} / 5 Selected
                          </span>
                        </div>
                        
                        <div className="relative border-2 border-dashed border-slate-200 rounded-2xl hover:border-cyan-400 transition-colors p-6 flex flex-col items-center justify-center bg-white/50 cursor-pointer">
                          <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <Camera className="text-slate-400 mb-2" size={24} />
                          <p className="text-xs font-semibold text-slate-600">
                            Click or Drag images to upload
                          </p>
                          <p className="text-[9px] text-slate-400 uppercase font-display font-bold mt-1">
                            PNG, JPG, GIF (Max 5MB)
                          </p>
                        </div>

                        {newProdImages.length > 0 && (
                          <div className="grid grid-cols-5 gap-3 mt-2">
                            {newProdImages.map((img, idx) => (
                              <div key={idx} className="aspect-square bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative group">
                                <img src={img} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removeUploadedImage(idx)}
                                  className="absolute top-1 right-1 p-1 bg-red-500/85 hover:bg-red-650 text-white rounded-full transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center shadow"
                                >
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-4 mt-2 bg-slate-900 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all hover:bg-cyan-600 hover:shadow-neonCyan hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        <Plus size={14} /> Register Store Product
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* 📦 TAB 2: INVENTORY & STOCK (Features 1, 3, 4) */}
              {activeTab === "inventory" && (
                <div className="flex flex-col gap-8">
                  <div>
                    <h1 className="font-display font-black text-2xl tracking-tight text-slate-900 uppercase">
                      Inventory Node
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Maintain stock indices and monitor market trend analysis
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Feature 4: Trend Analysis & Bestseller */}
                    <div className="md:col-span-3 flex flex-col gap-6 text-left">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div className="flex-grow">
                          <p className="text-[10px] text-slate-400 font-display font-extrabold uppercase tracking-widest mb-1">
                            Bestselling Operator Category
                          </p>
                          <h3 className="font-display font-black text-xl text-slate-900 uppercase">
                            Magnetic Coils Node
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Trend analysis streams confirm Coils have cleared **24 items** this week with a peak velocity rate of **+24%** month-over-month.
                          </p>
                        </div>
                        <div className="w-fit p-4 bg-cyan-50/50 border border-cyan-100 rounded-2xl flex flex-col items-center justify-center shrink-0">
                          <TrendingUp size={24} className="text-cyan-600 mb-1" />
                          <span className="text-[9px] font-display font-extrabold uppercase tracking-wider text-cyan-700">+24% Peak</span>
                        </div>
                      </div>

                      {/* Feature 1: Inventory Table & Stock Updates */}
                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 flex-grow">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-display text-[9px] font-extrabold tracking-widest">
                              <th className="py-4 px-6 text-left">Item Node</th>
                              <th className="py-4 px-6 text-left">Category</th>
                              <th className="py-4 px-6 text-center">Stock</th>
                              <th className="py-4 px-6 text-right">Unit Price</th>
                              <th className="py-4 px-6 text-center">Stock Control</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/50 font-semibold text-slate-700 font-sans">
                            {inventory.map((item) => (
                              <Fragment key={item.id}>
                                <tr 
                                  onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                                  className="hover:bg-white/40 transition-colors cursor-pointer"
                                >
                                  <td className="py-4 px-6 text-slate-900 flex items-center gap-2">
                                    <ChevronRight 
                                      size={12} 
                                      className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                                        expandedItemId === item.id ? "rotate-90 text-cyan-600" : ""
                                      }`} 
                                    />
                                    <span>{item.name}</span>
                                  </td>
                                  <td className="py-4 px-6 text-[10px] text-slate-500 font-display font-bold uppercase tracking-wider">{item.category}</td>
                                  <td className="py-4 px-6 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                                      item.stock === 0
                                        ? "bg-red-50 text-red-700 border border-red-100"
                                        : item.stock <= 5
                                        ? "bg-amber-50 text-amber-700 border border-amber-100"
                                        : "bg-green-50 text-green-700 border border-green-100"
                                    }`}>
                                      {item.stock} units
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-right text-slate-950">${item.price.toFixed(2)}</td>
                                  <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-center gap-1">
                                      <button 
                                        onClick={() => updateStockLevel(item.id, -1)}
                                        className="p-1 border border-slate-200 hover:bg-slate-100 hover:text-cyan-600 transition-all rounded"
                                      >
                                        <Minus size={10} />
                                      </button>
                                      <button 
                                        onClick={() => updateStockLevel(item.id, 1)}
                                        className="p-1 border border-slate-200 hover:bg-slate-100 hover:text-cyan-600 transition-all rounded"
                                      >
                                        <Plus size={10} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {expandedItemId === item.id && (
                                  <tr className="bg-slate-50/20">
                                    <td colSpan={5} className="p-6 border-b border-slate-100">
                                      <div className="flex flex-col md:flex-row gap-8 items-start text-left">
                                        
                                        {/* Product Photos */}
                                        <div className="w-full md:w-1/3 shrink-0">
                                          <p className="text-[9px] font-display font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                                            Product Photos
                                          </p>
                                          {item.images && item.images.length > 0 ? (
                                            <div className="flex gap-2 flex-wrap">
                                              {item.images.map((img, idx) => (
                                                <div 
                                                  key={idx} 
                                                  className="w-14 h-14 bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm hover:scale-105 transition-all cursor-pointer shrink-0"
                                                  onClick={() => window.open(img, "_blank")}
                                                >
                                                  <img src={img} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="bg-slate-100/30 border border-slate-150 rounded-xl p-4 flex flex-col items-center justify-center text-slate-400 aspect-[16/9] text-xs">
                                              <Camera size={20} className="mb-1 text-slate-350" />
                                              No custom photos uploaded
                                            </div>
                                          )}
                                        </div>

                                        {/* Product Description */}
                                        <div className="flex-grow">
                                          <p className="text-[9px] font-display font-extrabold uppercase tracking-widest text-slate-400 mb-2">
                                            Description Node
                                          </p>
                                          <p className="text-xs text-slate-600 leading-relaxed font-sans font-medium whitespace-pre-line">
                                            {item.description || "No custom description provided for this store product."}
                                          </p>

                                          {/* P&L per product */}
                                          {(() => {
                                            const pp = productPL.find(p => p.product_id === item.product_id);
                                            if (pp) {
                                              return (
                                                <div className="mt-4 grid grid-cols-4 gap-3">
                                                  <div className="bg-white border border-slate-100 rounded-xl p-2 text-center">
                                                    <p className="text-[8px] font-display font-extrabold uppercase tracking-widest text-slate-400">Sold</p>
                                                    <p className="text-sm font-display font-black text-slate-900">{pp.unitsSold}</p>
                                                  </div>
                                                  <div className="bg-white border border-slate-100 rounded-xl p-2 text-center">
                                                    <p className="text-[8px] font-display font-extrabold uppercase tracking-widest text-slate-400">Revenue</p>
                                                    <p className="text-sm font-display font-black text-green-700">${pp.revenue.toFixed(2)}</p>
                                                  </div>
                                                  <div className="bg-white border border-slate-100 rounded-xl p-2 text-center">
                                                    <p className="text-[8px] font-display font-extrabold uppercase tracking-widest text-slate-400">Profit</p>
                                                    <p className="text-sm font-display font-black text-slate-900">${pp.profit.toFixed(2)}</p>
                                                  </div>
                                                  <div className="bg-white border border-slate-100 rounded-xl p-2 text-center">
                                                    <p className="text-[8px] font-display font-extrabold uppercase tracking-widest text-slate-400">Margin</p>
                                                    <p className={`text-sm font-display font-black ${pp.profitMargin >= 0 ? 'text-green-700' : 'text-rose-700'}`}>{pp.profitMargin.toFixed(1)}%</p>
                                                  </div>
                                                </div>
                                              );
                                            }
                                            return null;
                                          })()}

                                          {/* Edit / Delete Controls */}
                                          <div className="mt-4 flex items-center gap-2">
                                            {editingProductId === item.product_id ? (
                                              <div className="w-full flex flex-col gap-3">
                                                <div className="grid grid-cols-3 gap-3">
                                                  <input type="text" value={editForm.name || ''} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} placeholder="Name" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                                                  <input type="number" step="0.01" value={editForm.price || ''} onChange={e => setEditForm(f => ({...f, price: e.target.value}))} placeholder="Sell Price" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                                                  <input type="number" step="0.01" value={editForm.cost_price || ''} onChange={e => setEditForm(f => ({...f, cost_price: e.target.value}))} placeholder="Cost Price" className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
                                                </div>
                                                <div className="flex gap-2">
                                                  <button onClick={() => handleUpdateProduct(item.product_id)} className="px-4 py-2 bg-cyan-600 text-white font-display font-bold text-[9px] tracking-wider uppercase rounded-lg transition-all hover:bg-cyan-700">
                                                    Save Changes
                                                  </button>
                                                  <button onClick={() => { setEditingProductId(null); setEditForm({}); }} className="px-4 py-2 border border-slate-200 text-slate-500 font-display font-bold text-[9px] tracking-wider uppercase rounded-lg transition-all hover:bg-slate-50">
                                                    Cancel
                                                  </button>
                                                </div>
                                              </div>
                                            ) : (
                                              <>
                                                <button onClick={() => { setEditingProductId(item.product_id); setEditForm({ name: item.name, price: item.price, cost_price: item.cost_price || 0, stock: item.stock, category: item.category, description: item.description }); }} className="px-3 py-1.5 border border-slate-200 text-slate-600 font-display font-bold text-[9px] tracking-wider uppercase rounded-lg transition-all hover:bg-slate-50 hover:text-cyan-600">
                                                  Edit Product
                                                </button>
                                                <button onClick={() => handleDeleteProduct(item.product_id)} className="px-3 py-1.5 border border-red-200 text-red-500 font-display font-bold text-[9px] tracking-wider uppercase rounded-lg transition-all hover:bg-red-50">
                                                  Delete
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>

                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ⚖️ TAB 3: DISTRIBUTOR & AUCTIONS (Features 2, 9, 14) */}
              {activeTab === "distributor" && (
                <div className="flex flex-col gap-8">
                  <div>
                    <h1 className="font-display font-black text-2xl tracking-tight text-slate-900 uppercase">
                      Distributor Hub
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Procure stock variables and place bids in the live distributor auction system
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Feature 2: Distributor Catalog Grid & Ordering */}
                    <div className="md:col-span-2 flex flex-col gap-6 text-left">
                      <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400">
                        Distributor Inventory Catalog
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {distributorCatalog.map((item) => (
                          <div key={item.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 text-left flex flex-col justify-between gap-4">
                            <div>
                              <p className="text-[8px] text-slate-400 font-display font-extrabold uppercase tracking-widest">
                                {item.supplier}
                              </p>
                              <h4 className="font-display font-bold text-sm text-slate-900 mt-1 leading-snug">
                                {item.name}
                              </h4>
                            </div>
                            <div>
                              <p className="text-lg font-display font-black text-slate-950">
                                ${item.price.toFixed(2)}
                              </p>
                              <button 
                                onClick={() => placeDistributorOrder(item)}
                                className="w-full py-2.5 mt-3 bg-white border border-slate-200 hover:border-cyan-300 text-slate-700 hover:text-cyan-600 font-display font-bold text-[9px] tracking-wider uppercase rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center gap-1"
                              >
                                <ShoppingCart size={11} /> Secure Order
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Feature 9: Logistics Delivery Trackings & GPS coordinates updating */}
                      <div className="flex flex-col gap-4 text-left">
                        <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400">
                          Active Logistics Delivery Trackings & GPS Tracker
                        </h3>
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-display text-[9px] font-extrabold tracking-widest">
                                <th className="py-4 px-6 text-left">Logistics ID</th>
                                <th className="py-4 px-6 text-left">Procured Item</th>
                                <th className="py-4 px-6 text-left">Carrier</th>
                                <th className="py-4 px-6 text-center">Status</th>
                                <th className="py-4 px-6 text-left">GPS Coordinates</th>
                                <th className="py-4 px-6 text-right">ETA</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100/50 font-semibold text-slate-700">
                              {deliveriesList.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                                    No active shipments in transit to this node
                                  </td>
                                </tr>
                              ) : (
                                deliveriesList.map((del) => {
                                  let itemsDisplay = "";
                                  if (Array.isArray(del.ordered_items_list)) {
                                    itemsDisplay = del.ordered_items_list.map(i => `${i.quantity}x ${i.product_name}`).join(", ");
                                  } else if (typeof del.ordered_items_list === 'string') {
                                    try {
                                      const parsed = JSON.parse(del.ordered_items_list);
                                      if (Array.isArray(parsed)) {
                                        itemsDisplay = parsed.map(i => `${i.quantity}x ${i.product_name}`).join(", ");
                                      }
                                    } catch (e) {
                                      itemsDisplay = String(del.ordered_items_list);
                                    }
                                  }
                                  
                                  return (
                                    <Fragment key={del.delivery_id}>
                                      <tr className="hover:bg-white/40 transition-colors">
                                        <td className="py-4 px-6 text-slate-500 font-mono select-all">
                                          {del.tracking_number}
                                        </td>
                                        <td className="py-4 px-6 text-slate-900 truncate max-w-[150px]">
                                          {itemsDisplay || "Custom Supplies"}
                                        </td>
                                        <td className="py-4 px-6 text-slate-650">
                                          {del.shipping_carrier}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                                            del.order_status === "Delivered"
                                              ? "bg-green-50 text-green-700 border border-green-150"
                                              : "bg-cyan-50 text-cyan-700 border border-cyan-150"
                                          }`}>
                                            {del.order_status}
                                          </span>
                                        </td>
                                        <td className="py-4 px-6 text-slate-900 font-mono">
                                          {del.current_gps_coordinates || "37.7749,-122.4194"}
                                        </td>
                                        <td className="py-4 px-6 text-right text-slate-500 font-sans font-semibold">
                                          {del.order_status === "Delivered" ? "Delivered" : (del.estimated_delivery_time ? new Date(del.estimated_delivery_time).toLocaleTimeString() : "Pending")}
                                        </td>
                                      </tr>
                                      
                                      {/* Interactive GPS Coordinates Modulator */}
                                      {del.order_status !== "Delivered" && (
                                        <tr>
                                          <td colSpan={6} className="bg-slate-50/20 px-6 py-4 border-b border-slate-100">
                                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                              <div className="flex gap-2 items-center text-[10px] text-slate-500 font-sans">
                                                <Truck size={12} className="text-cyan-600 shrink-0 animate-bounce" />
                                                <span>
                                                  <strong>Logistics Map Track:</strong> Calibrating live delivery route coordinates.
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2 w-full md:max-w-xs">
                                                <input
                                                  type="text"
                                                  placeholder="e.g. 37.7801,-122.4215"
                                                  defaultValue={del.current_gps_coordinates || "37.7749,-122.4194"}
                                                  onChange={(e) => setGpsInput(e.target.value)}
                                                  className="flex-grow px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 font-semibold"
                                                />
                                                <button
                                                  onClick={() => handleUpdateDeliveryGps(del.delivery_id, gpsInput || del.current_gps_coordinates || "37.7749,-122.4194")}
                                                  className="px-3 py-1.5 bg-slate-900 hover:bg-cyan-600 text-white rounded-lg text-[10px] font-display font-bold uppercase tracking-wider transition-colors shrink-0"
                                                >
                                                  Update GPS
                                                </button>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      )}
                                    </Fragment>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Feature 14: Live Auction System (Neon DB Synced) */}
                    <div className="md:col-span-1 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-left flex flex-col justify-between shadow-sm min-h-[500px]">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                          <h3 className="font-display font-black text-xs uppercase tracking-widest text-red-500">
                            Live Bidding Arena
                          </h3>
                        </div>
                        <p className="text-[10px] text-slate-400 font-display font-extrabold uppercase tracking-widest mb-6">
                          Active bulk distributors auctions registry
                        </p>

                        <div className="flex flex-col gap-6">
                          {dbAuctions.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 font-medium text-xs">
                              No active live auctions scheduled
                            </div>
                          ) : (
                            dbAuctions.map((auc) => (
                              <div key={auc.auction_id} className="bg-white border border-slate-150 rounded-2xl p-4 flex flex-col gap-3 relative shadow-sm">
                                
                                {/* Product Details */}
                                <div className="flex gap-3 items-center">
                                  <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden shrink-0">
                                    {auc.photos && auc.photos.length > 0 ? (
                                      <img src={auc.photos[0]} alt={auc.itemName} className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-350">
                                        <Camera size={16} />
                                      </div>
                                    )}
                                  </div>
                                  <div className="overflow-hidden text-left">
                                    <h4 className="font-display font-black text-xs text-slate-900 truncate">
                                      {auc.itemName}
                                    </h4>
                                    <p className="text-[9px] font-display font-bold uppercase tracking-wider text-slate-400 truncate mt-0.5">
                                      {auc.supplier} ({auc.category})
                                    </p>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 border-t border-slate-50 pt-2.5">
                                  <span>Ends: {new Date(auc.auction_countdown_end).toLocaleTimeString()}</span>
                                  <span className="text-cyan-600 max-w-[120px] truncate">
                                    {auc.highest_bidder_vendor_id === storeId ? "You (High Bid)" : `High Bidder: #${auc.highest_bidder_vendor_id || 'None'}`}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-xl p-3">
                                  <div className="text-left">
                                    <p className="text-[8px] text-slate-400 font-display font-extrabold uppercase tracking-widest">
                                      Current High
                                    </p>
                                    <p className="text-sm font-display font-black text-slate-950 font-mono">
                                      ${auc.current_highest_bid.toFixed(2)}
                                    </p>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5 max-w-[125px]">
                                    <input
                                      type="number"
                                      step="0.01"
                                      placeholder="Bid"
                                      value={biddingAuctionId === auc.auction_id ? bidInputPrice : ""}
                                      onChange={(e) => {
                                        setBiddingAuctionId(auc.auction_id);
                                        setBidInputPrice(e.target.value);
                                      }}
                                      className="w-16 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-cyan-500/20 focus:border-cyan-500 text-slate-700 font-mono font-bold"
                                    />
                                    <button
                                      onClick={() => handlePlaceDbAuctionBid(auc.auction_id, bidInputPrice)}
                                      disabled={submittingBid || biddingAuctionId !== auc.auction_id}
                                      className="p-2 bg-slate-900 text-white rounded-lg hover:bg-cyan-600 transition-colors flex items-center justify-center shrink-0 shadow-sm"
                                    >
                                      <Zap size={10} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="mt-8 text-[9px] text-slate-400 leading-relaxed font-semibold">
                        * Custom bids placed are fully binding and update database pools on Neon in real-time.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ⚖️ TAB 7: INVOICE BILLING & AI CHECKING (Relational DB & Live AI Auditor) */}
              {activeTab === "billing" && (
                <div className="flex flex-col gap-8">
                  <div>
                    <h1 className="font-display font-black text-2xl tracking-tight text-slate-900 uppercase">
                      Invoice Billing & AI Checking
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Submit invoices and run real-time automated AI audits against Neon PostgreSQL compliance parameters
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* Left: Invoice Registry Table */}
                    <div className="lg:col-span-2 flex flex-col gap-4 text-left">
                      <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400">
                        Audited Invoice Registry
                      </h3>
                      
                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-display text-[9px] font-extrabold tracking-widest">
                              <th className="py-4 px-6 text-left">Invoice ID</th>
                              <th className="py-4 px-6 text-right">Tax</th>
                              <th className="py-4 px-6 text-right">Discount</th>
                              <th className="py-4 px-6 text-right">Final Amount</th>
                              <th className="py-4 px-6 text-center">AI Audit Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/50 font-semibold text-slate-700">
                            {invoicesList.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                  No invoice records synced to this node
                                </td>
                              </tr>
                            ) : (
                              invoicesList.map((inv) => (
                                <Fragment key={inv.invoice_id}>
                                  <tr className="hover:bg-white/40 transition-colors">
                                    <td className="py-4 px-6 text-slate-500 font-mono">
                                      #INV-{inv.invoice_id}
                                    </td>
                                    <td className="py-4 px-6 text-right text-slate-500">
                                      ${inv.tax_amount.toFixed(2)}
                                    </td>
                                    <td className="py-4 px-6 text-right text-slate-500">
                                      -${inv.discount_applied.toFixed(2)}
                                    </td>
                                    <td className="py-4 px-6 text-right text-slate-950 font-display font-black text-sm">
                                      ${inv.final_payable_amount.toFixed(2)}
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                      <span className={`px-3 py-1 rounded-full text-[9px] font-display font-extrabold uppercase tracking-wider border ${
                                        inv.ai_verification_status === "Verified"
                                          ? "bg-green-50 text-green-700 border-green-200"
                                          : inv.ai_verification_status === "Flagged"
                                          ? "bg-amber-50 text-amber-700 border-amber-200"
                                          : "bg-red-50 text-red-700 border-red-200"
                                      }`}>
                                        {inv.ai_verification_status}
                                      </span>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td colSpan={5} className="bg-slate-50/20 px-6 py-3 border-b border-slate-100 text-left">
                                      <div className="flex gap-2 items-start text-[10px] text-slate-500 font-sans leading-relaxed">
                                        <Zap size={11} className="text-cyan-600 mt-0.5 shrink-0" />
                                        <span>
                                          <strong>AI Auditor Logs:</strong> {inv.ai_error_logs || 'No log details available.'}
                                        </span>
                                      </div>
                                    </td>
                                  </tr>
                                </Fragment>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Invoice submission form */}
                    <div className="lg:col-span-1 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-left flex flex-col gap-6 shadow-sm">
                      <div>
                        <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400">
                          AI Audit Console
                        </h3>
                        <p className="text-[10px] text-slate-400 font-display font-extrabold uppercase tracking-widest mt-1">
                          Verify invoice compliance before commit
                        </p>
                      </div>

                      <form onSubmit={handleSubmitInvoice} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                            Tax Amount ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={taxAmount}
                            onChange={(e) => setTaxAmount(e.target.value)}
                            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                            Discount Applied ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={discountApplied}
                            onChange={(e) => setDiscountApplied(e.target.value)}
                            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                            Final Payable Amount ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={finalPayableAmount}
                            onChange={(e) => setFinalPayableAmount(e.target.value)}
                            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={submittingInvoice}
                          className="w-full py-4 mt-2 bg-slate-900 hover:bg-cyan-600 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 hover:shadow-neonCyan hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          {submittingInvoice ? "Processing Audit..." : "Submit & Run AI Audit"}
                        </button>
                      </form>

                      {/* Info Alert audit constraints */}
                      <div className="border-t border-slate-200/60 pt-4 text-[9px] text-slate-400 leading-relaxed font-semibold">
                        <p className="uppercase text-[8px] font-display font-extrabold text-cyan-600 mb-1">
                          Compliance Rule Parameters:
                        </p>
                        <ul className="list-disc pl-3 flex flex-col gap-1">
                          <li>Final amounts ≤ 0 are audited as <strong>Mismatch</strong> anomalies.</li>
                          <li>Negative values inside tax or discount indexes are <strong>Flagged</strong>.</li>
                          <li>Clean registries are securely committed to Neon with <strong>Verified</strong> tags.</li>
                        </ul>
                      </div>
                    </div>

                  </div>
                </div>
              )}


              {/* 📱 TAB: TELEGRAM CUSTOMER MESSAGING */}
              {activeTab === "telegram-customers" && (
                <div className="flex flex-col gap-8">
                  <div>
                    <h1 className="font-display font-black text-2xl tracking-tight text-slate-900 uppercase">
                      Telegram Customer Messaging
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Broadcast templates and dispatch verified alerts directly to opted-in Telegram clients.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Customer Registry Table */}
                    <div className="lg:col-span-2 flex flex-col gap-4 text-left">
                      <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400">
                        Opted-in Customer Registry
                      </h3>
                      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-display text-[9px] font-extrabold tracking-widest">
                              <th className="py-4 px-6 text-left">Customer ID</th>
                              <th className="py-4 px-6 text-left">Telegram Chat ID</th>
                              <th className="py-4 px-6 text-center">Opt-in Status</th>
                              <th className="py-4 px-6 text-left">Last Message Dispatched</th>
                              <th className="py-4 px-6 text-center">Delivery Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/50 font-semibold text-slate-700">
                            {telegramCustomers.length === 0 ? (
                              <tr>
                                <td colSpan={5} className="py-8 text-center text-slate-400 font-medium">
                                  No registered Telegram customer directories found
                                </td>
                              </tr>
                            ) : (
                              telegramCustomers.map((cust) => (
                                <tr key={cust.customer_id} className="hover:bg-white/40 transition-colors font-semibold">
                                  <td className="py-4 px-6 text-slate-900 font-mono">#CUST-{cust.customer_id}</td>
                                  <td className="py-4 px-6 text-slate-650 font-mono select-all">{cust.telegram_chat_id}</td>
                                  <td className="py-4 px-6 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                                      cust.opt_in_status
                                        ? "bg-green-50 text-green-700 border border-green-150"
                                        : "bg-red-50 text-red-700 border border-red-150"
                                    }`}>
                                      {cust.opt_in_status ? "Opted In" : "Opted Out"}
                                    </span>
                                  </td>
                                  <td className="py-4 px-6 text-slate-500 font-sans font-medium">
                                    {cust.last_message_sent_timestamp ? new Date(cust.last_message_sent_timestamp).toLocaleString() : "Never"}
                                  </td>
                                  <td className="py-4 px-6 text-center">
                                    {cust.message_delivery_status ? (
                                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-display font-extrabold uppercase tracking-wider ${
                                        cust.message_delivery_status === "Delivered"
                                          ? "bg-green-50 text-green-700 border border-green-200"
                                          : cust.message_delivery_status === "Sent"
                                          ? "bg-cyan-50 text-cyan-700 border border-cyan-200"
                                          : "bg-red-50 text-red-700 border border-red-200"
                                      }`}>
                                        {cust.message_delivery_status}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 font-medium">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Messaging Console Card */}
                    <div className="lg:col-span-1 bg-slate-50 border border-slate-100 rounded-3xl p-6 text-left flex flex-col gap-6 shadow-sm">
                      <div>
                        <h3 className="font-display font-black text-xs uppercase tracking-widest text-slate-400">
                          Dispatch Console
                        </h3>
                        <p className="text-[10px] text-slate-400 font-display font-extrabold uppercase tracking-widest mt-1">
                          Stream customer broadcasts directly
                        </p>
                      </div>

                      <form onSubmit={handleSendTelegramCustomer} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                            Target Customer Node
                          </label>
                          <select
                            value={selectedCustomerId}
                            onChange={(e) => setSelectedCustomerId(e.target.value)}
                            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 font-sans font-bold text-slate-700"
                            required
                          >
                            {telegramCustomers.map((cust) => (
                              <option key={cust.customer_id} value={cust.customer_id}>
                                Customer #{cust.customer_id} ({cust.telegram_chat_id})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-display font-extrabold tracking-widest text-slate-400 uppercase ml-0.5">
                            Broadcast Message
                          </label>
                          <textarea
                            placeholder="Type customer broadcast message templates (e.g. Your shipping order is prepared!)..."
                            value={custMessageText}
                            onChange={(e) => setCustMessageText(e.target.value)}
                            rows="4"
                            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 resize-none font-sans font-semibold text-slate-700"
                            required
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={sendingCustMsg || telegramCustomers.length === 0}
                          className="w-full py-4 bg-slate-900 hover:bg-cyan-600 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all duration-300 hover:shadow-neonCyan hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                          {sendingCustMsg ? "Transmitting..." : "Broadcast Message"}
                        </button>
                      </form>

                      <div className="border-t border-slate-200/60 pt-4 text-[9px] text-slate-400 leading-relaxed font-semibold">
                        <p className="uppercase text-[8px] font-display font-extrabold text-cyan-600 mb-1">
                          Messaging Compliance Guidelines:
                        </p>
                        <ul className="list-disc pl-3 flex flex-col gap-1">
                          <li>Message templates stream instantly to local gateway nodes.</li>
                          <li>Opt-out customers will not accept broadcast sequences.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* 🤖 TAB 6: AI CO-PILOT CHAT & COMMUNITY (Features 12, 13) */}
              {activeTab === "ai" && (
                <div className="flex flex-col gap-8">
                  <div>
                    <h1 className="font-display font-black text-2xl tracking-tight text-slate-900 uppercase">
                      AI Co-pilot Chat
                    </h1>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Interact with VerseAI co-pilot advisor and link with the Telegram vendor community
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                    
                    {/* Feature 13: AI Assistance Chatbot */}
                    <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[450px]">
                      
                      {/* Chat History Panel */}
                      <div className="flex-grow flex flex-col gap-4 overflow-y-auto max-h-[320px] mb-4 pr-1 text-left">
                        {chatHistory.map((msg, idx) => (
                          <div 
                            key={idx}
                            className={`flex flex-col gap-1 max-w-[80%] ${
                              msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                            }`}
                          >
                            <span className="text-[8px] text-slate-400 font-display font-extrabold uppercase tracking-wider ml-1">
                              {msg.role === "user" ? "You" : "VerseAI"}
                            </span>
                            <div className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-sm whitespace-pre-wrap ${
                              msg.role === "user"
                                ? "bg-slate-900 text-white rounded-tr-none"
                                : "bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-none"
                            }`}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex flex-col gap-1 max-w-[80%] mr-auto items-start">
                            <span className="text-[8px] text-slate-400 font-display font-extrabold uppercase tracking-wider ml-1">VerseAI</span>
                            <div className="p-3.5 rounded-2xl rounded-tl-none bg-slate-50 border border-slate-100 shadow-sm flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chat Input Field */}
                      <form onSubmit={handleChatSubmit} className="flex gap-2">
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={chatLoading}
                          placeholder={chatLoading ? "VerseAI is thinking..." : "Ask about stock, profit margins, pricing strategy..."}
                          className="flex-grow px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                        <button
                          type="submit"
                          disabled={chatLoading || !chatInput.trim()}
                          className="p-3.5 bg-slate-900 hover:bg-cyan-600 text-white transition-all rounded-xl shadow-sm hover:shadow-neonCyan flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={14} />
                        </button>
                      </form>
                    </div>

                    {/* Feature 12: Telegram Vendor Community Integration */}
                    <div className="md:col-span-1 bg-slate-50 border border-slate-100 rounded-2xl p-6 text-left flex flex-col justify-between">
                      <div>
                        <div className="w-12 h-12 bg-cyan-50 border border-cyan-100 rounded-xl flex items-center justify-center text-cyan-600 mb-5 shadow-sm">
                          <Users size={22} />
                        </div>
                        <h3 className="font-display font-black text-sm text-slate-900 uppercase leading-snug">
                          Telegram Vendor Community
                        </h3>
                        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                          Link with fellow verified commerce nodes. Audit joint cross-border shipping, share restocking indices, and evaluate distributor auctions globally!
                        </p>
                      </div>

                      <div>
                        <a 
                          href="https://t.me/vendorverse_collective"
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-4.5 bg-slate-950 text-white font-display font-bold text-xs tracking-wider uppercase rounded-xl transition-all hover:bg-cyan-600 hover:shadow-neonCyan flex items-center justify-center gap-1.5"
                        >
                          Join Community Node
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Global dashboard status footer */}
            <div className="border-t border-slate-200/50 pt-8 mt-12 flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] text-slate-400 font-display font-bold uppercase tracking-widest">
              <p>Active Store ID: {currentUser ? "Node_002" : "Unconnected"}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span>
                <span>Active Connection Secure</span>
              </div>
            </div>

          </main>

        </div>
      )}

    </div>
  );
}
