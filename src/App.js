import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, Euro, LayoutDashboard, PieChart, Sparkles, Send, 
  Menu, X, Calendar as CalendarIcon, ClipboardList, Calculator,
  Plus, Trash2, CheckSquare, Square, Edit3, Image as ImageIcon,
  AlertTriangle, Layers, Info, CheckCircle2, UserCircle,
  Clock, ArrowRight, RefreshCw, UploadCloud, ChevronRight, Target, Wifi
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- IMPORT FIREBASE ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyB2ufi79mvIiWt06F3FTKTY8eSIb4EdPEI",
  authDomain: "podeliha-manager-v1.firebaseapp.com",
  projectId: "podeliha-manager-v1",
  storageBucket: "podeliha-manager-v1.firebasestorage.app",
  messagingSenderId: "685953762762",
  appId: "1:685953762762:web:abc712baa2dc523113fb33",
  measurementId: "G-9PMPR10RQV"
};

const appId = 'projet-immo-local';

let db, auth;
if (firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

// --- 1. COMPOSANTS UI EXTERNALISÉS ---

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ProgressBar = ({ value, color }) => (
  <div className="w-full bg-slate-100 rounded-full h-2">
    <div className={`h-2 rounded-full ${color} transition-all duration-700`} style={{ width: `${value}%` }}></div>
  </div>
);

const StackedBarChart = ({ data, total }) => {
  const maxVal = total || 1; 
  if (!data || typeof data !== 'object') return null;
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([macroName, val]) => {
        if (val === 0 && macroName === "Aléas") return null;
        const numVal = typeof val === 'number' ? val : 0;
        return (
          <div key={macroName}>
            <div className="flex justify-between text-xs md:text-sm font-bold mb-1 text-slate-700">
              <span>{macroName}</span>
              <span className="font-mono">{numVal.toLocaleString()} €</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden flex">
               <div className={`h-full ${macroName === 'Aléas' ? 'bg-rose-500' : (macroName === 'Enveloppe' ? 'bg-blue-500' : (macroName === 'Technique' ? 'bg-emerald-500' : 'bg-amber-500'))}`} style={{ width: `${(numVal / maxVal) * 100}%` }}></div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- 2. DONNÉES PAR DÉFAUT ---
const DEFAULT_BUDGET = [
  {
    id: 1, name: "Scénario 1 : Les Fondamentaux", shortName: "S1 (Urgent)", color: "bg-amber-500", textColor: "text-amber-600",
    categories: [
      { name: "Extérieur", macro: "Enveloppe", items: [{ id: 's1_ext_1', label: "Remplacement ITE défectueux", cost: 97500 }, { id: 's1_ext_2', label: "Remplacement ITE fissuré", cost: 37500 }] },
      { name: "Intérieur", macro: "Intérieur", items: [{ id: 's1_int_1', label: "Rénov. Totale 6 logements", cost: 45600 }, { id: 's1_int_2', label: "Reprise sols SDB", cost: 11880 }, { id: 's1_int_3', label: "Reprise murs SDB", cost: 13200 }] },
      { name: "Technique", macro: "Technique", items: [{ id: 's1_tech_1', label: "Mise aux normes tableaux élec", cost: 23520 }, { id: 's1_tech_2', label: "Actualisation éclairage", cost: 14300 }, { id: 's1_tech_3', label: "Remplacement radiateurs", cost: 55000 }, { id: 's1_tech_4', label: "Chasses d'eau", cost: 7700 }, { id: 's1_tech_5', label: "Meubles éviers + robinets", cost: 29700 }, { id: 's1_tech_6', label: "Baignoire > Douche PMR", cost: 39600 }] }
    ]
  },
  {
    id: 2, name: "Scénario 2 : L'Optimum", shortName: "S2 (Confort)", color: "bg-indigo-500", textColor: "text-indigo-600",
    categories: [
      { name: "Extérieur", macro: "Enveloppe", items: [{ id: 's2_ext_1', label: "Portes Locaux Techniques", cost: 10200 }, { id: 's2_ext_2', label: "Peinture escaliers", cost: 28800 }, { id: 's2_ext_3', label: "Nettoyage Façades Saines", cost: 85000 }, { id: 's2_com_1', label: "Eclairage Communs LED", cost: 2500 }, { id: 's2_com_2', label: "Rampe PMR", cost: 7500 }] },
      { name: "Technique", macro: "Technique", items: [{ id: 's2_vmc_1', label: "Bouches VMC Cuisine", cost: 5500 }, { id: 's2_plomb_1', label: "Robinet Local OM", cost: 250 }] },
      { name: "Intérieur", macro: "Intérieur", items: [{ id: 's2_int_1', label: "Reprise portes d'entrées", cost: 8000 }] }
    ]
  },
  {
    id: 3, name: "Scénario 3 : À prévoir", shortName: "S3 (Futur)", color: "bg-slate-400", textColor: "text-slate-500",
    categories: [
      { name: "Extérieur", macro: "Enveloppe", items: [{ id: 's3_ext_1', label: "Boîtes aux Lettres", cost: 5000 }, { id: 's3_ext_2', label: "Marquage stationnement", cost: 7500 }] }
    ]
  }
];

const DEFAULT_ACTION_PLAN = [
  {
    id: 1, title: "Phase 1 : Conception", status: "En cours", progress: 50,
    tasks: [
      { id: 101, text: "Validation du programme travaux", done: true, notes: [{author: "MOA", text: "Validé CODIR", date: "20/11"}] },
    ]
  }
];

const TARGET_BUDGET = 270000;

// --- 3. APP ---

const App = () => {
  const [activeTab, setActiveTab] = useState('synthese');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(true);
  
  // Modales
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false); // Nouvelle modale de suppression
  const [taskToDelete, setTaskToDelete] = useState(null); // Stocke la tâche à supprimer

  const [activePhaseIdForTask, setActivePhaseIdForTask] = useState(null);
  const [activeTaskForEdit, setActiveTaskForEdit] = useState(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [activeWeek, setActiveWeek] = useState(null);
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false);
  const [newPhaseTitle, setNewPhaseTitle] = useState('');

  // Temp Inputs
  const [tempTaskName, setTempTaskName] = useState('');
  const [tempTaskPhase, setTempTaskPhase] = useState('');
  const [tempNoteContent, setTempNoteContent] = useState('');
  const [tempImageUrl, setTempImageUrl] = useState('');
  const [tempEventNote, setTempEventNote] = useState('');
  const [tempEventType, setTempEventType] = useState('jalon');
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseCost, setNewExpenseCost] = useState('');

  // IA
  const [messages, setMessages] = useState([{ role: 'model', text: "Bonjour. Je suis connecté à votre base de données Podeliha. Je surveille le budget et le planning en temps réel. Une question ?" }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // DATA STATES
  const [budgetData, setBudgetData] = useState(DEFAULT_BUDGET);
  const [actionPlan, setActionPlan] = useState(DEFAULT_ACTION_PLAN);
  const [calendarEvents, setCalendarEvents] = useState({ 12: [{id: 1, note: "Dépôt DCE", type: "jalon"}] });
  const [selectedBudgetItems, setSelectedBudgetItems] = useState(DEFAULT_BUDGET[0].categories.flatMap(c => c.items.map(i => i.id)));
  const [customBudgetItems, setCustomBudgetItems] = useState([]);

  // --- FIREBASE SYNC LOGIC ---
  
  useEffect(() => {
    if (!auth) return;
   const initAuth = async () => {
  // En local, on utilise directement la connexion anonyme
  try {
    await signInAnonymously(auth);
    console.log("Connecté anonymement à Firebase !");
  } catch (error) {
    console.error("Erreur de connexion :", error);
  }
};
    initAuth();
    return onAuthStateChanged(auth, setUser);
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    const listenToDoc = (collectionName, setter, defaultVal) => {
      return onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', collectionName, 'content'), (snapshot) => {
        if (snapshot.exists()) {
          setter(snapshot.data().payload);
        } else {
          setDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, 'content'), { payload: defaultVal });
          setter(defaultVal);
        }
        setIsSyncing(false);
      });
    };

    const unsubBudget = listenToDoc('budgetData', setBudgetData, DEFAULT_BUDGET);
    const unsubAction = listenToDoc('actionPlan', setActionPlan, DEFAULT_ACTION_PLAN);
    const unsubCalendar = listenToDoc('calendarEvents', setCalendarEvents, { 12: [{id: 1, note: "Dépôt DCE", type: "jalon"}] });
    const unsubSelected = listenToDoc('selectedBudgetItems', setSelectedBudgetItems, DEFAULT_BUDGET[0].categories.flatMap(c => c.items.map(i => i.id)));
    const unsubCustom = listenToDoc('customBudgetItems', setCustomBudgetItems, []);

    return () => {
      unsubBudget(); unsubAction(); unsubCalendar(); unsubSelected(); unsubCustom();
    };
  }, [user]);

  const saveData = (collectionName, data) => {
    if (!user || !db) return;
    switch(collectionName) {
        case 'budgetData': setBudgetData(data); break;
        case 'actionPlan': setActionPlan(data); break;
        case 'calendarEvents': setCalendarEvents(data); break;
        case 'selectedBudgetItems': setSelectedBudgetItems(data); break;
        case 'customBudgetItems': setCustomBudgetItems(data); break;
    }
    setDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, 'content'), { payload: data }, { merge: true });
  };

  // --- LOGIQUE MÉTIER ---

  const calculateTotalBase = () => {
    let base = 0;
    if(Array.isArray(budgetData)) {
      budgetData.forEach(s => s.categories.forEach(c => c.items.forEach(i => { if (selectedBudgetItems.includes(i.id)) base += (parseFloat(i.cost) || 0); })));
    }
    return base;
  };
  const getCustomTotal = () => customBudgetItems.reduce((acc, i) => acc + (parseFloat(i.cost) || 0), 0);
  const calculateGrandTotal = () => calculateTotalBase() + getCustomTotal();
  
  const overrun = calculateGrandTotal() - TARGET_BUDGET;
  const overrunPercent = Math.round((overrun / TARGET_BUDGET) * 100);
  const aleasPercent = Math.round((getCustomTotal() / calculateGrandTotal()) * 100) || 0;
  const costPerUnit = Math.round(calculateGrandTotal() / 22);

  const updateBudgetItem = (sId, iId, lbl, cost) => {
    const newData = budgetData.map(s => s.id !== sId ? s : { ...s, categories: s.categories.map(c => ({ ...c, items: c.items.map(i => i.id === iId ? { ...i, label: lbl, cost: parseFloat(cost)||0 } : i) })) });
    saveData('budgetData', newData);
  };
  const toggleEntireScenario = (sId) => {
    const ids = budgetData.find(s => s.id === sId).categories.flatMap(c => c.items.map(i => i.id));
    const allSelected = ids.every(id => selectedBudgetItems.includes(id));
    let newSelected;
    if (allSelected) newSelected = selectedBudgetItems.filter(id => !ids.includes(id));
    else newSelected = [...new Set([...selectedBudgetItems, ...ids])];
    saveData('selectedBudgetItems', newSelected);
  };

  const addNewPhase = () => { 
      if(newPhaseTitle) { 
          const newData = [...actionPlan, { id: Date.now(), title: newPhaseTitle, status: "A venir", progress: 0, tasks: [] }];
          saveData('actionPlan', newData);
          setNewPhaseTitle(''); setIsPhaseModalOpen(false); 
      } 
  };
  
  const openTaskModal = () => {
    if (actionPlan.length > 0) setTempTaskPhase(actionPlan[0].id);
    setTempTaskName('');
    setIsTaskModalOpen(true);
  };

  const confirmAddTask = () => { 
    if(tempTaskName && tempTaskPhase) { 
      const newData = actionPlan.map(p => p.id == tempTaskPhase ? { ...p, tasks: [...(p.tasks||[]), { id: Date.now(), text: tempTaskName, done: false, notes: [] }] } : p);
      saveData('actionPlan', newData);
      setIsTaskModalOpen(false); 
    } 
  };
  
  const toggleTask = (pId, tId) => {
    const newData = actionPlan.map(p => {
      if (p.id === pId) {
        const tasks = (p.tasks||[]).map(t => t.id === tId ? { ...t, done: !t.done } : t);
        return { ...p, tasks, progress: Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) || 0 };
      } return p;
    });
    saveData('actionPlan', newData);
  };
  
  // Demande de suppression (ouvre modale)
  const requestDeleteTask = (pId, tId) => {
    setTaskToDelete({ pId, tId });
    setIsDeleteModalOpen(true);
  };

  // Confirmation de suppression
  const confirmDeleteTask = () => {
    if (taskToDelete) {
      const { pId, tId } = taskToDelete;
      const newData = actionPlan.map(p => {
        if (p.id === pId) {
          const tasks = (p.tasks||[]).filter(t => t.id !== tId);
          return { ...p, tasks, progress: tasks.length ? Math.round((tasks.filter(t => t.done).length / tasks.length) * 100) : 0 };
        } return p;
      });
      saveData('actionPlan', newData);
      setIsDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };
  
  const addNoteToTask = () => {
    if(!tempNoteContent && !tempImageUrl) return;
    const newData = actionPlan.map(p => ({ ...p, tasks: (p.tasks||[]).map(t => t.id === activeTaskForEdit.id ? { ...t, notes: [...(t.notes || []), { author: "MOA", text: tempNoteContent, image: tempImageUrl, date: new Date().toLocaleDateString() }] } : t) }));
    saveData('actionPlan', newData);
    setTempNoteContent(''); setTempImageUrl('');
  };
  const handleImageUpload = (e) => { const f = e.target.files[0]; if(f) { const r = new FileReader(); r.onloadend = () => setTempImageUrl(r.result); r.readAsDataURL(f); } };

  const addEventToWeek = () => { 
      if(tempEventNote) { 
          const newEvents = { ...calendarEvents, [activeWeek]: [...(calendarEvents[activeWeek]||[]), { id: Date.now(), note: tempEventNote, type: tempEventType }] };
          saveData('calendarEvents', newEvents);
          setTempEventNote(''); setIsCalendarModalOpen(false); 
      } 
  };
  const removeEvent = (w, id) => { 
      const evts = calendarEvents[w].filter(e => e.id !== id);
      const newEvents = {...calendarEvents};
      if(evts.length === 0) delete newEvents[w]; else newEvents[w] = evts;
      saveData('calendarEvents', newEvents);
  };
  const getNextWeeksEvents = () => {
    const weeks = Object.keys(calendarEvents).map(Number).sort((a,b)=>a-b);
    if(weeks.length === 0) return [];
    return weeks.slice(0, 4).map(w => ({ week: w, events: calendarEvents[w] }));
  };

  const getMacroLotData = () => {
    const data = { "Enveloppe": 0, "Intérieur": 0, "Technique": 0, "Aléas": getCustomTotal() };
    if(Array.isArray(budgetData)) {
      budgetData.forEach(s => s.categories.forEach(c => c.items.forEach(i => { if (selectedBudgetItems.includes(i.id)) { const k = c.macro || "Enveloppe"; data[k] += (parseFloat(i.cost)||0); } })));
    }
    return data;
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return; setMessages(prev => [...prev, { role: 'user', text: input }]); const userMsg = input; setInput(''); setIsLoading(true);
    try {
        const apiKey = ""; const genAI = new GoogleGenerativeAI(apiKey); const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" });
        const context = `Assistant MOA. Budget Cible: 270k. Actuel: ${calculateGrandTotal()} (Dépassement: ${overrunPercent}%). Plan: ${JSON.stringify(actionPlan)}.`;
        const result = await model.generateContent([context, userMsg]); setMessages(prev => [...prev, { role: 'model', text: result.response.text() }]);
    } catch { setMessages(prev => [...prev, { role: 'model', text: "Erreur IA." }]); } finally { setIsLoading(false); }
  };

  const getEventTypeColor = (t) => {
      if(t==='jalon') return 'bg-indigo-600 text-white';
      if(t==='réunion') return 'bg-blue-100 text-blue-800 border border-blue-200';
      if(t==='travaux') return 'bg-amber-100 text-amber-800 border border-amber-200';
      return 'bg-slate-100 text-slate-600 border border-slate-200';
  };

  const handleResetData = () => { if(window.confirm("Réinitialiser ? (Ceci effacera la base de données)")) { 
      // Reset local et on pourrait aussi reset la DB si besoin, mais le local suffit pour clean l'affichage immédiat
      window.location.reload(); 
  }};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-600 font-sans flex flex-col">
      
      {/* NAV */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center w-full">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200"><Building2 className="w-5 h-5 md:w-6 md:h-6 text-white" /></div>
            <div><h1 className="text-lg md:text-xl font-bold text-slate-900 leading-none">La Taillée <span className="text-indigo-600">Manager</span></h1><p className="text-[10px] md:text-xs text-slate-500 mt-1">Outil Collaboratif MOA/MOE</p></div>
          </div>
          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
             {[{id: 'synthese', label: 'Synthèse', icon: LayoutDashboard}, {id: 'action', label: 'Plan d\'Action', icon: ClipboardList}, {id: 'planning', label: 'Planning', icon: CalendarIcon}, {id: 'budget', label: 'Budget', icon: Calculator}, {id: 'assistant', label: 'IA', icon: Sparkles}].map(tab => (
               <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><tab.icon className="w-4 h-4"/> {tab.label}</button>
             ))}
          </div>
          <div className="flex items-center gap-2">
             <div className="text-xs flex items-center gap-1 text-slate-400">
               {isSyncing ? <RefreshCw className="w-3 h-3 animate-spin"/> : <Wifi className="w-3 h-3 text-emerald-500"/>}
               <span className="hidden md:inline">{isSyncing ? 'Sync...' : 'Online'}</span>
             </div>
             <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="md:hidden p-2 text-slate-600"><Menu /></button>
          </div>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-slate-200 shadow-xl p-4 flex flex-col gap-2 animate-in slide-in-from-top-2">
            {[{id: 'synthese', label: 'Synthèse', icon: LayoutDashboard}, {id: 'action', label: 'Plan d\'Action', icon: ClipboardList}, {id: 'planning', label: 'Planning', icon: CalendarIcon}, {id: 'budget', label: 'Budget', icon: Calculator}, {id: 'assistant', label: 'IA', icon: Sparkles}].map(tab => (
               <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 p-3 rounded-xl text-sm font-bold ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600'}`}>
                 <tab.icon className="w-5 h-5"/> {tab.label}
               </button>
             ))}
          </div>
        )}
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6 pb-20 w-full flex-1">
        {activeTab === 'synthese' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full filter blur-3xl opacity-20 -mr-16 -mt-16"></div>
                  <div className="flex flex-col md:flex-row justify-between items-start">
                    <div>
                        <h2 className="text-slate-400 font-medium mb-1 flex items-center gap-2 text-sm md:text-base"><Euro className="w-5 h-5" /> Prévisionnel Actuel</h2>
                        <div className="text-3xl md:text-4xl font-bold tracking-tight mb-1">{calculateGrandTotal().toLocaleString()} €</div>
                        <div className="text-xs md:text-sm opacity-60 font-mono">{costPerUnit.toLocaleString()} € / Logement</div>
                    </div>
                    {overrun > 0 && <div className="mt-2 md:mt-0 bg-amber-500/20 border border-amber-500/50 text-amber-200 px-3 py-1 rounded-lg text-xs font-bold">+{overrunPercent}% vs Cible</div>}
                  </div>
                  <div className="mt-6 border-t border-slate-700 pt-4 flex items-center justify-between">
                      <div className="text-xs text-slate-400">Part des Aléas</div>
                      <div className="text-rose-400 font-bold text-lg">{aleasPercent}%</div>
                  </div>
              </div>

              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                 <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-600"/> Stratégie</h3><span className="text-xs text-slate-400 hidden md:block">Cliquez pour activer/désactiver</span></div>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {budgetData.map(s => {
                        const ids = s.categories.flatMap(c => c.items.map(i => i.id));
                        const pct = Math.round((ids.filter(id => selectedBudgetItems.includes(id)).length / ids.length) * 100);
                        return (
                            <div key={s.id} onClick={() => toggleEntireScenario(s.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${pct === 100 ? `bg-white border-${s.color.split('-')[1]}-500 shadow-md` : 'bg-slate-50 border-transparent hover:border-slate-300'}`}>
                                <div className="flex justify-between items-start mb-2"><span className={`font-bold text-sm ${s.textColor}`}>{s.shortName}</span>{pct === 100 ? <CheckCircle2 className={`w-5 h-5 ${s.textColor}`} /> : <div className="w-5 h-5 rounded-full border-2 border-slate-300" />}</div>
                                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-4"><div className={`h-full ${s.color}`} style={{width: `${pct}%`}}></div></div>
                            </div>
                        )
                     })}
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><CalendarIcon className="w-5 h-5 text-indigo-600"/> Prochains événements</h3>
                   <div className="flex-1 flex gap-3 overflow-x-auto pb-2 min-h-[100px]">
                      {getNextWeeksEvents().length === 0 ? <div className="w-full flex items-center justify-center text-slate-300 text-sm italic">Aucun événement planifié</div> : 
                        getNextWeeksEvents().map(({week, events}) => (
                         <div key={week} className="min-w-[140px] flex-1 border border-slate-100 rounded-xl p-3 bg-slate-50 hover:bg-white hover:shadow-md transition-all">
                             <div className="font-bold text-slate-900 text-sm mb-2 border-b border-slate-200 pb-1">Sem. {week}</div>
                             <div className="space-y-1.5">{events.map((evt, i) => <div key={i} className={`text-[10px] px-2 py-1 rounded font-bold truncate border ${getEventTypeColor(evt.type)}`} title={evt.note}>{evt.note}</div>)}</div>
                         </div>
                      ))}
                   </div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                   <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><PieChart className="w-5 h-5 text-indigo-600"/> Répartition</h3>
                   <StackedBarChart data={getMacroLotData()} total={calculateGrandTotal()} />
                </div>
            </div>
          </div>
        )}

        {activeTab === 'action' && (
          <div className="space-y-6 animate-in fade-in">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div><h2 className="text-2xl font-bold text-slate-800">Plan d'Action</h2><p className="text-slate-500">Suivi des tâches & Journal.</p></div>
               <div className="flex gap-2 w-full md:w-auto">
                 <button onClick={() => setIsPhaseModalOpen(true)} className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 flex-1 md:flex-none text-center">+ Phase</button>
                 <button onClick={openTaskModal} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 flex-1 md:flex-none"><Plus className="w-4 h-4" /> Tâche</button>
               </div>
             </div>
             
             {(!Array.isArray(actionPlan)) ? <div className="text-rose-500">Erreur données. Réinitialisez l'app.</div> : (
               <div className="grid grid-cols-1 gap-6">
                 {actionPlan.map(phase => (
                   <div key={phase.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 uppercase text-sm tracking-wide">{phase.title}</h3>
                        <div className="flex items-center gap-4"><span className="text-xs font-bold text-slate-500">{phase.progress}%</span><div className="w-24 hidden md:block"><ProgressBar value={phase.progress} color="bg-emerald-500" /></div></div>
                     </div>
                     <div className="divide-y divide-slate-100">
                        {(!phase.tasks || phase.tasks.length === 0) && <div className="p-6 text-slate-400 italic text-sm text-center">Aucune tâche.</div>}
                        {(phase.tasks||[]).map(task => (
                          <div key={task.id} className="p-4 md:p-6 hover:bg-slate-50/50 transition-colors group">
                             <div className="flex items-start gap-4 mb-4 relative">
                                <button onClick={() => toggleTask(phase.id, task.id)} className={`mt-1 transition-colors ${task.done ? 'text-emerald-500' : 'text-slate-300 hover:text-indigo-500'}`}>
                                   {task.done ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                                </button>
                                <div className="flex-1">
                                   <h4 className={`text-base md:text-lg font-medium ${task.done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.text}</h4>
                                   {(task.notes||[]).length > 0 && <div className="mt-4 space-y-3 pl-2 border-l-2 border-slate-200">{task.notes.map((note, i) => (
                                        <div key={i} className="bg-white border border-slate-200 p-3 rounded-lg text-sm shadow-sm flex gap-3"><div className="flex-shrink-0"><UserCircle className="w-8 h-8 text-indigo-200" /></div><div className="flex-1"><div className="flex justify-between items-center mb-1"><span className="font-bold text-slate-700">{note.author}</span><span className="text-xs text-slate-400">{note.date}</span></div><p className="text-slate-600 mb-2">{note.text}</p>{note.image && <img src={note.image} alt="Preuve" className="h-24 rounded border border-slate-200 object-cover" />}</div></div>
                                   ))}</div>}
                                   <button onClick={() => setActiveTaskForEdit(task)} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2 px-3 py-1.5 bg-indigo-50 rounded-md border border-indigo-100 w-fit"><Plus className="w-3 h-3" /> Note / Photo</button>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); requestDeleteTask(phase.id, task.id); }} className="absolute right-0 top-0 p-2 text-slate-300 hover:text-rose-500 md:opacity-0 md:group-hover:opacity-100 transition-opacity"><Trash2 className="w-5 h-5"/></button>
                             </div>
                          </div>
                        ))}
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {activeTab === 'planning' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 animate-in fade-in">
            <h2 className="text-xl font-bold mb-6">Planning 2026</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
               {Array.from({length: 52}, (_, i) => i + 1).map(week => {
                 const events = calendarEvents[week] || [];
                 return (
                   <div key={week} onClick={() => { setActiveWeek(week); setIsCalendarModalOpen(true); }} className="min-h-[80px] md:min-h-[100px] rounded-xl border border-slate-100 bg-slate-50 hover:border-indigo-300 hover:shadow-md cursor-pointer transition-all flex flex-col p-1.5 overflow-hidden group">
                      <span className="text-xs font-bold text-slate-400 text-center mb-1 group-hover:text-indigo-600">S{week}</span>
                      <div className="flex flex-col gap-1 w-full flex-1">{events.slice(0, 3).map((evt, i) => <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded font-bold leading-tight truncate border ${getEventTypeColor(evt.type)}`} title={evt.note}>{evt.note}</div>)}</div>
                   </div>
                 )
               })}
            </div>
          </div>
        )}

        {activeTab === 'budget' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg flex flex-col md:flex-row justify-between items-center gap-4 sticky top-20 z-30">
                <div><h2 className="text-xl font-bold">Arbitrage Budgétaire</h2><p className="text-slate-500 text-sm">Cible : {TARGET_BUDGET.toLocaleString()} €</p></div>
                <div className="text-right"><div className="text-3xl font-bold text-indigo-600">{calculateGrandTotal().toLocaleString()} €</div>{overrun > 0 && <div className="text-xs font-bold text-amber-600 uppercase">Dépassement {overrunPercent}%</div>}</div>
             </div>
             
             {(!budgetData || !Array.isArray(budgetData)) ? <div className="p-8 text-center text-rose-500">Erreur chargement.</div> : (
               <div className="space-y-4">{budgetData.map(s => (
                    <div key={s.id} className={`bg-white rounded-xl border-2 overflow-hidden transition-colors ${selectedBudgetItems.some(id => s.categories.flatMap(c=>c.items).map(i=>i.id).includes(id)) ? `border-${s.color.split('-')[1]}-100` : 'border-slate-100'}`}>
                      <div className={`p-4 border-b border-slate-100 flex justify-between items-center ${s.id===1?'bg-amber-50':s.id===2?'bg-indigo-50':'bg-slate-50'}`}><div className="flex items-center gap-3"><div className={`px-3 py-1 rounded text-xs font-bold text-white uppercase ${s.color}`}>{s.shortName}</div><h3 className="font-bold text-lg text-slate-800">{s.name}</h3></div></div>
                      <div className="divide-y divide-slate-100">{s.categories.map((c, i) => (
                            <div key={i}>
                                <div className="bg-slate-50/80 px-6 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.name}</div>
                                {c.items.map(item => { const isSelected = selectedBudgetItems.includes(item.id); return (
                                  <div key={item.id} className={`px-4 md:px-6 py-3 flex items-center gap-4 group hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                                      <div onClick={() => setSelectedBudgetItems(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])} className={`w-5 h-5 rounded border flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300'}`}>{isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}</div>
                                      <div className="flex-1 flex flex-col md:flex-row md:items-center gap-2">
                                        <input className={`flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-sm px-1 py-1 ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-500'}`} value={item.label} onChange={(e) => updateBudgetItem(s.id, item.id, e.target.value, item.cost)}/>
                                        <div className="flex items-center gap-2"><input type="number" className="w-24 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none text-sm font-mono text-right" value={item.cost} onChange={(e) => updateBudgetItem(s.id, item.id, item.label, e.target.value)}/><span className="text-slate-400 text-sm">€</span><Edit3 className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" /></div>
                                      </div>
                                  </div>
                                )})}
                            </div>
                          ))}</div>
                    </div>
                  ))}</div>
             )}

             <div className="bg-rose-50 border border-rose-200 rounded-xl p-6">
                <h3 className="font-bold text-rose-700 flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5" /> Aléas</h3>
                {customBudgetItems.map((item, idx) => ( 
                    <div key={idx} className="bg-white p-3 rounded-lg border border-rose-100 mb-2 flex justify-between items-center shadow-sm">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <div className="flex items-center gap-3">
                            <span className="font-bold text-rose-600">{item.cost.toLocaleString()} €</span>
                            <button onClick={() => {
                                const newData = customBudgetItems.filter((_, i) => i !== idx);
                                saveData('customBudgetItems', newData);
                            }} className="text-slate-400 hover:text-rose-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div> 
                ))}
                <div className="flex flex-col md:flex-row gap-2 mt-4">
                    <input className="flex-1 border rounded-lg px-3 py-2 text-sm" placeholder="Nom..." value={newExpenseName} onChange={e => setNewExpenseName(e.target.value)} />
                    <input className="w-full md:w-24 border rounded-lg px-3 py-2 text-sm" type="number" placeholder="Coût" value={newExpenseCost} onChange={e => setNewExpenseCost(e.target.value)} />
                    <button onClick={() => { 
                        if(newExpenseName && newExpenseCost) { 
                            const newData = [...customBudgetItems, {label: newExpenseName, cost: parseFloat(newExpenseCost)}];
                            saveData('customBudgetItems', newData);
                            setNewExpenseName(''); 
                            setNewExpenseCost(''); 
                        } 
                    }} className="bg-rose-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-rose-600 flex items-center justify-center gap-2">
                        <Plus className="w-4 h-4" /> Ajouter
                    </button>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'assistant' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-[70vh] flex flex-col animate-in fade-in">
             <div className="p-4 border-b bg-slate-50 rounded-t-2xl"><h3 className="font-bold flex items-center gap-2"><Sparkles className="text-indigo-600 w-5 h-5"/> Assistant Gemini</h3></div>
             <div className="flex-1 overflow-y-auto p-4 space-y-4">{messages.map((m, i) => ( <div key={i} className={`p-4 rounded-xl max-w-[85%] ${m.role === 'user' ? 'bg-indigo-600 text-white ml-auto' : 'bg-slate-100 text-slate-800'}`}>{m.text}</div> ))}{isLoading && <div className="text-slate-400 text-sm italic p-4">Analyse en cours...</div>}<div ref={messagesEndRef} /></div>
             <div className="p-4 border-t flex gap-2"><input className="flex-1 border rounded-xl px-4 py-2" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleSendMessage()} placeholder="Question..." /><button onClick={handleSendMessage} className="bg-indigo-600 text-white p-2 rounded-xl"><Send className="w-5 h-5" /></button></div>
          </div>
        )}
      </main>

      <footer className="text-center py-6 text-slate-300 text-xs mt-auto">© Térence POUHE KANGA</footer>

      {/* --- MODALES --- */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Nouvelle Tâche">
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Titre</label><input autoFocus className="w-full border p-3 rounded-lg mb-4 text-sm outline-none" value={tempTaskName} onChange={e => setTempTaskName(e.target.value)} />
        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Phase</label><select className="w-full border p-3 rounded-lg mb-4 text-sm outline-none bg-white" value={tempTaskPhase} onChange={e => setTempTaskPhase(parseInt(e.target.value))}>{actionPlan.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select>
        <button onClick={confirmAddTask} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Créer</button>
      </Modal>

      <Modal isOpen={isPhaseModalOpen} onClose={() => setIsPhaseModalOpen(false)} title="Nouvelle Phase">
        <input autoFocus className="w-full border p-3 rounded-lg mb-4 text-sm outline-none" placeholder="Ex: Phase 3 : Livraison" value={newPhaseTitle} onChange={e => setNewPhaseTitle(e.target.value)} />
        <button onClick={addNewPhase} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Ajouter</button>
      </Modal>

      <Modal isOpen={!!activeTaskForEdit} onClose={() => setActiveTaskForEdit(null)} title="Journal de Tâche">
        <div className="space-y-4">
          <div><label className="text-xs font-bold text-slate-500 uppercase">Note</label><textarea className="w-full border p-3 rounded-lg text-sm mt-1 outline-none" rows="4" value={tempNoteContent} onChange={e => setTempNoteContent(e.target.value)} /></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2"><ImageIcon className="w-3 h-3"/> Image (Locale)</label><div className="flex items-center gap-2"><label className="flex-1 cursor-pointer bg-slate-50 border border-dashed border-slate-300 rounded-lg p-3 text-center hover:bg-slate-100 transition-colors"><span className="text-sm text-slate-500 flex items-center justify-center gap-2"><UploadCloud className="w-4 h-4"/> Choisir un fichier</span><input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} /></label></div>{tempImageUrl && <div className="mt-2"><img src={tempImageUrl} alt="Preview" className="h-20 rounded border object-cover"/></div>}</div>
          <button onClick={() => { addNoteToTask(); setActiveTaskForEdit(null); }} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Enregistrer</button>
        </div>
      </Modal>

      <Modal isOpen={isCalendarModalOpen} onClose={() => setIsCalendarModalOpen(false)} title={`Semaine ${activeWeek} - Planning`}>
         <div className="space-y-4">
            {calendarEvents[activeWeek] && calendarEvents[activeWeek].length > 0 && (<div className="bg-slate-50 p-3 rounded-lg space-y-2 mb-4"><div className="text-xs font-bold text-slate-400 uppercase">Événements prévus</div>{calendarEvents[activeWeek].map(evt => (<div key={evt.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-sm"><div className="flex items-center gap-2"><div className={`text-[10px] px-2 py-0.5 rounded font-bold ${getEventTypeColor(evt.type)}`}>{evt.type}</div><span className="text-sm font-medium">{evt.note}</span></div><button onClick={() => removeEvent(activeWeek, evt.id)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button></div>))}</div>)}
            <div className="border-t border-slate-100 pt-4"><div className="text-sm font-bold text-indigo-900 mb-2">Ajouter un événement</div><input autoFocus className="w-full border p-3 rounded-lg text-sm mb-3 outline-none" placeholder="Libellé" value={tempEventNote} onChange={e => setTempEventNote(e.target.value)} /><div className="flex gap-2 mb-4 overflow-x-auto pb-2">{['jalon', 'réunion', 'travaux', 'admin'].map(t => (<button key={t} onClick={() => setTempEventType(t)} className={`px-3 py-1 rounded-full text-xs font-bold capitalize border ${tempEventType === t ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200'}`}>{t}</button>))}</div><button onClick={addEventToWeek} className="w-full bg-indigo-600 text-white py-2 rounded-lg font-bold">Planifier</button></div>
         </div>
      </Modal>

      {/* --- MODALE SUPPRESSION --- */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirmer Suppression">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Voulez-vous vraiment supprimer cette tâche ? Cette action est irréversible.</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium text-sm">Annuler</button>
            <button onClick={confirmDeleteTask} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium text-sm">Supprimer</button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;
