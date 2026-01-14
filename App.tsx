
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Search, 
  Smartphone, 
  Users, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  History,
  User,
  Zap,
  Tag,
  Edit2,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
  DollarSign,
  XCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  Receipt,
  Phone,
  Calendar,
  CreditCard,
  X,
  FileText,
  ShieldCheck,
  Plus,
  Minus,
  Contact2,
  Save,
  Activity
} from 'lucide-react';
import { Contract, ContractStatus, Customer, PaymentType, Payment } from './types';
import { formatVND, formatDate, calculateInterest, calculateDaysBetween, formatNumber, parseNumber, removeDiacritics } from './utils/formatters';
import StatusBadge from './components/StatusBadge';
import { estimateDeviceValue } from './services/geminiService';

const CONFIG_KEY = 'pawn_config_v1';

const App: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const saved = localStorage.getItem('pawn_contracts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('pawn_contracts', JSON.stringify(contracts));
  }, [contracts]);

  const [view, setView] = useState<'dashboard' | 'contracts' | 'add' | 'customers' | 'customer_history' | 'overdue'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContractStatus>('ALL');
  
  const [selectedCustomerIdForHistory, setSelectedCustomerIdForHistory] = useState<string | null>(null);

  const [quickActionModal, setQuickActionModal] = useState<{ 
    type: 'interest' | 'redeem' | 'details' | 'add_principal' | 'reduce_principal', 
    contract: Contract | null 
  }>({ type: 'details', contract: null });

  const [principalAdjustAmount, setPrincipalAdjustAmount] = useState('0');
  const [interestPaidAmount, setInterestPaidAmount] = useState('0');

  // Form states
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [formBrand, setFormBrand] = useState('Apple');
  const [formModel, setFormModel] = useState('');
  const [formCondition, setFormCondition] = useState('99% (Như mới)');
  const [formLoanAmount, setFormLoanAmount] = useState('0');
  const [formCustomerName, setFormCustomerName] = useState('');
  const [formCustomerPhone, setFormCustomerPhone] = useState('');
  const [formCustomerIdCard, setFormCustomerIdCard] = useState('');
  const [formImei, setFormImei] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formIsNoPaper, setFormIsNoPaper] = useState(false);
  const [formNotes, setFormNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formInterestRate, setFormInterestRate] = useState(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved).rate : '3000';
  });
  const [formInterestType, setFormInterestType] = useState<'ngày' | 'tháng'>(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved).type : 'ngày';
  });
  const [formDuration, setFormDuration] = useState(() => {
    const saved = localStorage.getItem(CONFIG_KEY);
    return saved ? JSON.parse(saved).duration : '30';
  });

  useEffect(() => {
    if (!editingContractId && view === 'add') {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ 
        rate: formInterestRate, 
        type: formInterestType, 
        duration: formDuration 
      }));
    }
  }, [formInterestRate, formInterestType, formDuration, editingContractId, view]);

  const [aiValuation, setAiValuation] = useState<any>(null);
  const [isValuating, setIsValuating] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  useEffect(() => {
    if (quickActionModal.type === 'interest' && quickActionModal.contract) {
      const due = calculateInterest(
        quickActionModal.contract.loanAmount, 
        quickActionModal.contract.interestRate, 
        quickActionModal.contract.startDate, 
        quickActionModal.contract.interestType, 
        quickActionModal.contract.lastInterestPaidDate,
        quickActionModal.contract.residualInterest
      );
      setInterestPaidAmount(formatNumber(due));
    }
  }, [quickActionModal.type, quickActionModal.contract]);

  const uniqueCustomers = useMemo(() => {
    const map = new Map<string, Customer>();
    contracts.forEach(c => {
      const key = `${c.customer.name.toLowerCase()}_${c.customer.phone}`;
      if (!map.has(key)) map.set(key, c.customer);
    });
    return Array.from(map.values());
  }, [contracts]);

  const customerSuggestions = useMemo(() => {
    if (!formCustomerName) return [];
    return uniqueCustomers.filter(c => 
      removeDiacritics(c.name).includes(removeDiacritics(formCustomerName)) ||
      c.phone.includes(formCustomerName)
    ).slice(0, 5);
  }, [formCustomerName, uniqueCustomers]);

  const previousItemsForSelectedCustomer = useMemo(() => {
    if (!formCustomerName) return [];
    const items = new Map<string, { brand: string, model: string, loan: number }>();
    contracts
      .filter(c => removeDiacritics(c.customer.name) === removeDiacritics(formCustomerName))
      .forEach(c => {
        const key = `${c.device.brand}_${c.device.model}`;
        if (!items.has(key)) {
          items.set(key, { brand: c.device.brand, model: c.device.model, loan: c.loanAmount });
        }
      });
    return Array.from(items.values());
  }, [formCustomerName, contracts]);

  const handleSelectPreviousItem = (item: { brand: string, model: string, loan: number }) => {
    setFormBrand(item.brand);
    setFormModel(item.model);
    if (parseNumber(formLoanAmount) === 0) {
      setFormLoanAmount(formatNumber(item.loan));
    }
  };

  const clearForm = () => {
    const savedConfig = localStorage.getItem(CONFIG_KEY);
    const config = savedConfig ? JSON.parse(savedConfig) : { rate: '3000', type: 'ngày', duration: '30' };
    setEditingContractId(null);
    setFormBrand('Apple');
    setFormModel('');
    setFormCondition('99% (Như mới)');
    setFormCustomerName('');
    setFormCustomerPhone('');
    setFormCustomerIdCard('');
    setFormImei('');
    setFormLoanAmount('0');
    setFormIsNoPaper(false);
    setFormNotes('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormInterestRate(config.rate);
    setFormInterestType(config.type);
    setFormDuration(config.duration);
    setAiValuation(null);
    setShowAdvanced(false);
  };

  const startEditing = (contract: Contract) => {
    setEditingContractId(contract.id);
    setFormBrand(contract.device.brand);
    setFormModel(contract.device.model);
    setFormCondition(contract.device.condition);
    setFormCustomerName(contract.customer.name);
    setFormCustomerPhone(contract.customer.phone);
    setFormCustomerIdCard(contract.customer.idCard);
    setFormImei(contract.device.imei);
    setFormLoanAmount(formatNumber(contract.loanAmount));
    setFormIsNoPaper(contract.isNoPaper);
    setFormNotes(contract.notes || '');
    setFormStartDate(contract.startDate);
    setFormInterestRate(contract.interestRate.toString());
    setFormInterestType(contract.interestType);
    const dur = calculateDaysBetween(contract.startDate, contract.dueDate);
    setFormDuration(dur.toString());
    setView('add');
    setShowAdvanced(true);
    setQuickActionModal({ type: 'details', contract: null });
  };

  const handleSubmitContract = (e: React.FormEvent) => {
    e.preventDefault();
    const loan = parseNumber(formLoanAmount);
    const start = new Date(formStartDate);
    start.setDate(start.getDate() + Number(formDuration));
    const dueDate = start.toISOString().split('T')[0];

    if (editingContractId) {
      setContracts(prev => prev.map(c => c.id === editingContractId ? {
        ...c,
        customer: { ...c.customer, name: formCustomerName, phone: formCustomerPhone, idCard: formCustomerIdCard },
        device: { ...c.device, brand: formBrand, model: formModel, imei: formImei, condition: formCondition },
        loanAmount: loan, interestRate: Number(formInterestRate), interestType: formInterestType,
        startDate: formStartDate, dueDate: dueDate, isNoPaper: formIsNoPaper, notes: formNotes
      } : c));
    } else {
      const newContract: Contract = {
        id: `HD-${Math.floor(1000 + Math.random() * 9000)}`,
        customer: { id: `C${Math.random()}`, name: formCustomerName, phone: formCustomerPhone, idCard: formCustomerIdCard || 'Chưa cập nhật' },
        device: { brand: formBrand, model: formModel, imei: formImei || 'Chưa có', condition: formCondition, estimatedValue: aiValuation?.marketValue || loan * 1.5 },
        loanAmount: loan, interestRate: Number(formInterestRate), interestType: formInterestType,
        startDate: formStartDate, dueDate: dueDate, status: ContractStatus.ACTIVE, isNoPaper: formIsNoPaper,
        notes: formNotes, payments: [], residualInterest: 0, lastInterestPaidDate: undefined
      };
      setContracts([newContract, ...contracts]);
    }
    setView('contracts');
    clearForm();
  };

  const handleStatusUpdate = (contractId: string, status: ContractStatus) => {
    setContracts(prev => prev.map(c => c.id === contractId ? { ...c, status } : c));
    setQuickActionModal({ type: 'details', contract: null });
  };

  const handlePayInterest = (contractId: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;

    const amountPaid = parseNumber(interestPaidAmount);
    if (amountPaid <= 0) return;

    let dailyRate = 0;
    if (contract.interestType === 'ngày') {
      dailyRate = (contract.loanAmount / 1000000) * contract.interestRate;
    } else {
      dailyRate = (contract.loanAmount * (contract.interestRate / 100)) / 30;
    }

    if (dailyRate === 0) return;

    const totalCash = amountPaid + (contract.residualInterest || 0);
    const extensionDays = Math.floor(totalCash / dailyRate);
    const remainingResidual = totalCash % dailyRate;

    const currentDueDate = new Date(contract.dueDate);
    currentDueDate.setDate(currentDueDate.getDate() + extensionDays);
    const newDueDate = currentDueDate.toISOString().split('T')[0];

    const refDate = contract.lastInterestPaidDate || contract.startDate;
    const nextPaidToDate = new Date(refDate);
    const isFirstTime = !contract.lastInterestPaidDate;
    const increment = isFirstTime ? (extensionDays - 1) : extensionDays;
    nextPaidToDate.setDate(nextPaidToDate.getDate() + Math.max(0, increment));
    const newPaidToDate = nextPaidToDate.toISOString().split('T')[0];

    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: amountPaid,
      type: PaymentType.INTEREST,
      note: `Gia hạn ${extensionDays} ngày. Dư: ${formatVND(remainingResidual)}`
    };

    setContracts(prev => prev.map(c => c.id === contractId ? {
      ...c,
      dueDate: newDueDate,
      lastInterestPaidDate: newPaidToDate,
      residualInterest: remainingResidual,
      payments: [...(c.payments || []), newPayment],
      status: ContractStatus.ACTIVE
    } : c));

    setQuickActionModal({ type: 'details', contract: null });
    setInterestPaidAmount('0');
    alert(`Đã đóng lãi ${formatVND(amountPaid)}. Gia hạn thêm ${extensionDays} ngày.`);
  };

  const handleAdjustPrincipal = (contractId: string, type: 'add' | 'reduce') => {
    const amount = parseNumber(principalAdjustAmount);
    if (amount <= 0) return;

    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      type: PaymentType.PRINCIPAL,
      note: type === 'add' ? 'Lấy thêm gốc' : 'Trả bớt gốc'
    };

    setContracts(prev => prev.map(c => {
      if (c.id === contractId) {
        const newLoanAmount = type === 'add' ? c.loanAmount + amount : Math.max(0, c.loanAmount - amount);
        return {
          ...c,
          loanAmount: newLoanAmount,
          payments: [...(c.payments || []), newPayment]
        };
      }
      return c;
    }));

    setQuickActionModal({ type: 'details', contract: null });
    setPrincipalAdjustAmount('0');
  };

  const deleteContract = (id: string) => {
    if (confirm('Xóa vĩnh viễn hợp đồng này? Thao tác không thể hoàn tác.')) {
      setContracts(prev => prev.filter(c => c.id !== id));
      setQuickActionModal({ type: 'details', contract: null });
    }
  };

  const handleMoneyMask = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormLoanAmount(formatNumber(Number(e.target.value.replace(/\D/g, ""))));
  };

  const handleValuation = async () => {
    if (!formModel) return;
    setIsValuating(true);
    const result = await estimateDeviceValue(formBrand, formModel, formCondition);
    setAiValuation(result);
    if (result) setFormLoanAmount(formatNumber(result.suggestedLoan));
    setIsValuating(false);
  };

  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === ContractStatus.ACTIVE);
    return {
      activeCount: active.length,
      overdueCount: contracts.filter(c => {
        const isExpired = calculateDaysBetween(c.dueDate) > 0;
        return isExpired && (c.status === ContractStatus.ACTIVE || c.status === ContractStatus.OVERDUE);
      }).length,
      totalLoaned: active.reduce((sum, c) => sum + c.loanAmount, 0),
    };
  }, [contracts]);

  const viewCustomerHistory = (customer: Customer) => {
    setSelectedCustomerIdForHistory(customer.name);
    setView('customer_history');
  };

  const filteredContracts = useMemo(() => {
    let result = contracts;
    if (view === 'customer_history' && selectedCustomerIdForHistory) {
      result = result.filter(c => c.customer.name === selectedCustomerIdForHistory);
    } else if (view === 'overdue') {
      result = result.filter(c => {
        const isExpired = calculateDaysBetween(c.dueDate) > 0;
        return isExpired && (c.status === ContractStatus.ACTIVE || c.status === ContractStatus.OVERDUE);
      });
    }

    if (view === 'contracts' && statusFilter !== 'ALL') {
      result = result.filter(c => {
        if (statusFilter === ContractStatus.OVERDUE) {
          const isExpired = calculateDaysBetween(c.dueDate) > 0;
          return isExpired && (c.status === ContractStatus.ACTIVE || c.status === ContractStatus.OVERDUE);
        }
        return c.status === statusFilter;
      });
    }

    const normSearch = removeDiacritics(searchTerm);
    if (normSearch) {
      result = result.filter(c => 
        removeDiacritics(c.customer.name).includes(normSearch) || 
        removeDiacritics(c.device.model).includes(normSearch) ||
        c.id.toLowerCase().includes(normSearch) ||
        c.customer.phone.includes(normSearch)
      );
    }
    return result;
  }, [searchTerm, contracts, view, selectedCustomerIdForHistory, statusFilter]);

  const sortedCustomers = useMemo(() => {
    return uniqueCustomers.filter(c => 
      removeDiacritics(c.name).includes(removeDiacritics(searchTerm)) || 
      c.phone.includes(searchTerm)
    );
  }, [uniqueCustomers, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          {view === 'customer_history' ? (
            <button onClick={() => setView('customers')} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6 text-slate-600" />
            </button>
          ) : (
            <div className="bg-emerald-500 p-1.5 rounded-lg">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
          )}
          <h1 className="font-black text-lg text-slate-800 tracking-tight truncate">
            {view === 'dashboard' && 'Tổng quan'}
            {view === 'contracts' && 'Sổ Cầm Đồ'}
            {view === 'customers' && 'Khách hàng'}
            {view === 'add' && (editingContractId ? 'Sửa Hợp đồng' : 'Lập HD Mới')}
            {view === 'customer_history' && 'Lịch sử Khách'}
            {view === 'overdue' && 'Quá Hạn & Thanh Lý'}
          </h1>
        </div>
      </header>

      {/* Search bar & Filters */}
      {(view === 'contracts' || view === 'customers' || view === 'overdue') && (
        <div className="bg-white border-b border-slate-200 p-3 z-30 sticky top-[53px] space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder={view === 'customers' ? "Tên khách, SĐT..." : "Tên, model, mã HD..."} 
              className="w-full pl-10 pr-4 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          
          {view === 'contracts' && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {(['ALL', ContractStatus.ACTIVE, ContractStatus.OVERDUE, ContractStatus.LIQUIDATED, ContractStatus.REDEEMED] as const).map(f => (
                <button 
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase whitespace-nowrap transition-all border ${statusFilter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200'}`}
                >
                  {f === 'ALL' ? 'Tất cả' : f}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <main className="flex-1 p-4 pb-24 overflow-x-hidden overflow-y-auto">
        {view === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div 
                onClick={() => { setView('contracts'); setStatusFilter(ContractStatus.ACTIVE); }}
                className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col active:scale-95 transition-transform cursor-pointer"
              >
                <div className="bg-emerald-100 w-10 h-10 rounded-2xl flex items-center justify-center mb-3">
                  <Activity className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Đang cầm</span>
                <span className="text-2xl font-black text-slate-800">{stats.activeCount}</span>
              </div>
              <div 
                onClick={() => setView('overdue')}
                className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col active:scale-95 transition-transform cursor-pointer"
              >
                <div className="bg-rose-100 w-10 h-10 rounded-2xl flex items-center justify-center mb-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quá hạn</span>
                <span className="text-2xl font-black text-slate-800">{stats.overdueCount}</span>
              </div>
            </div>
            
            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
              <TrendingUp className="absolute right-[-10px] bottom-[-10px] w-48 h-48 opacity-5" />
              <div className="relative z-10">
                <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Tổng dư nợ thị trường</p>
                <h3 className="text-4xl font-black mb-2">{formatVND(stats.totalLoaned)}</h3>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" /> Hoạt động gần đây
                </h4>
                <button onClick={() => setView('contracts')} className="text-[10px] font-black text-emerald-600 uppercase">Tất cả</button>
              </div>
              <div className="space-y-5">
                {contracts.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center gap-4 group cursor-pointer" onClick={() => setQuickActionModal({ type: 'details', contract: c })}>
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center font-black text-slate-500">
                      {c.customer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate mb-0.5">{c.customer.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{c.device.model}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{formatVND(c.loanAmount)}</p>
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(view === 'contracts' || view === 'customer_history' || view === 'overdue') && (
          <div className="space-y-4 pb-8 animate-in fade-in duration-300">
            {filteredContracts.map(c => {
              const interest = calculateInterest(c.loanAmount, c.interestRate, c.startDate, c.interestType, c.lastInterestPaidDate, c.residualInterest);
              const overdueDays = calculateDaysBetween(c.dueDate);
              const isOverdue = overdueDays > 0 && c.status !== ContractStatus.REDEEMED && c.status !== ContractStatus.LIQUIDATED;

              return (
                <div 
                  key={c.id} 
                  className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden active:shadow-md transition-all cursor-pointer ${isOverdue ? 'ring-2 ring-rose-500/20 bg-rose-50/10' : ''}`}
                >
                  <div onClick={() => setQuickActionModal({ type: 'details', contract: c })}>
                    <div className="p-4 flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 ${isOverdue ? 'bg-rose-100 text-rose-600' : 'bg-slate-900 text-white'}`}>
                        {c.customer.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-black text-slate-800 text-base leading-none truncate pr-2">{c.customer.name}</h4>
                          <span className="text-[10px] font-mono font-bold text-slate-400">{c.id}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mb-2 flex items-center gap-1.5 truncate">
                          {c.device.model}
                          {c.isNoPaper && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Ko giấy</span>}
                        </p>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={isOverdue ? ContractStatus.OVERDUE : c.status} />
                          {isOverdue && <span className="text-[10px] font-black text-rose-600 uppercase bg-rose-100 px-1.5 py-0.5 rounded">Trễ {overdueDays} ngày</span>}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 px-4 py-3 grid grid-cols-2 gap-4 border-t border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tiền Gốc</span>
                        <span className="text-lg font-black text-slate-900">{formatVND(c.loanAmount)}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Tiền Lãi</span>
                        <span className="text-lg font-black text-emerald-600">{formatVND(interest)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Thao tác nhanh trực tiếp trong danh sách */}
                  {(c.status === ContractStatus.ACTIVE || c.status === ContractStatus.OVERDUE) && (
                    <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setQuickActionModal({ type: 'interest', contract: c }); }}
                        className="flex-1 py-3.5 flex items-center justify-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 transition-colors"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Đóng lãi
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setQuickActionModal({ type: 'redeem', contract: c }); }}
                        className="flex-1 py-3.5 flex items-center justify-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-colors"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Chuộc
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {view === 'customers' && (
          <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-300">
            {sortedCustomers.map(customer => {
              const activeCount = contracts.filter(c => c.customer.name === customer.name && c.status === ContractStatus.ACTIVE).length;
              return (
                <div 
                  key={customer.name + customer.phone} 
                  className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4 active:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => viewCustomerHistory(customer)}
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl">
                    {customer.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-slate-800 text-lg leading-none mb-1 truncate">{customer.name}</h3>
                    <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {customer.phone || 'N/A'}</p>
                  </div>
                  <div className="text-center bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100">
                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-0.5 tracking-tight">Active</p>
                    <p className="text-xl font-black text-emerald-700">{activeCount}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-300" />
                </div>
              );
            })}
          </div>
        )}

        {view === 'add' && (
          <div className="animate-in slide-in-from-bottom duration-300 pb-10">
             <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-200 relative overflow-hidden">
                <form onSubmit={handleSubmitContract} className="space-y-6">
                  {/* Step 1: Customer */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-emerald-500" />
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</label>
                    </div>
                    <div className="relative">
                      <input 
                        value={formCustomerName}
                        onChange={(e) => { setFormCustomerName(e.target.value); setShowCustomerDropdown(true); }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        required
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800 text-lg focus:ring-4 focus:ring-emerald-500/10"
                        placeholder="Tên khách hàng..."
                      />
                      {showCustomerDropdown && formCustomerName && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                          {customerSuggestions.length > 0 ? (
                            <div className="p-1">
                              {customerSuggestions.map(c => (
                                <button key={c.id} type="button" onClick={() => { setFormCustomerName(c.name); setFormCustomerPhone(c.phone); setFormCustomerIdCard(c.idCard); setShowCustomerDropdown(false); }} className="w-full text-left px-5 py-3 rounded-xl hover:bg-emerald-50 flex items-center justify-between group">
                                  <div className="flex flex-col">
                                    <span className="font-bold text-slate-800 text-sm">{c.name}</span>
                                    <span className="text-[10px] text-slate-400 font-bold">{c.phone || 'N/A'}</span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-slate-300" />
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="p-4 bg-indigo-50/50 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-indigo-600">Khách mới</span>
                              <button type="button" onClick={() => setShowCustomerDropdown(false)} className="text-[10px] font-black text-indigo-600 border border-indigo-200 px-3 py-1 rounded-lg bg-white">Thêm</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {previousItemsForSelectedCustomer.length > 0 && (
                      <div className="pt-2 animate-in fade-in duration-300">
                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-2">Tài sản cũ của khách này:</label>
                        <div className="flex flex-wrap gap-2">
                          {previousItemsForSelectedCustomer.map((item, idx) => (
                            <button 
                              key={idx} 
                              type="button" 
                              onClick={() => handleSelectPreviousItem(item)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-emerald-50 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-600 flex items-center gap-1.5 active:scale-95 transition-transform"
                            >
                              <Smartphone className="w-3 h-3" /> {item.model}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2: Device & Amount */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-500" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thiết bị</label>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formIsNoPaper} onChange={(e) => setFormIsNoPaper(e.target.checked)} className="w-5 h-5 accent-amber-500 rounded-lg" />
                        <span className="text-[10px] font-black text-amber-600 uppercase">Ko giấy</span>
                      </label>
                    </div>
                    <div className="relative">
                      <input value={formModel} onChange={(e) => setFormModel(e.target.value)} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-800" placeholder="Model (VD: iPhone 15...)" />
                      <button type="button" onClick={handleValuation} className="absolute right-2 top-2 p-2 bg-emerald-500 text-white rounded-xl shadow-lg text-[10px] font-black flex items-center gap-1">
                        <Tag className={`w-3 h-3 ${isValuating ? 'animate-spin' : ''}`} /> GIÁ AI
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiền cầm</label>
                      </div>
                      <input value={formLoanAmount} onChange={handleMoneyMask} required className="w-full px-6 py-5 bg-slate-900 border-none rounded-[1.5rem] outline-none font-black text-white text-3xl text-center focus:ring-4 focus:ring-emerald-500/20" />
                    </div>
                  </div>

                  {/* Step 3: Interest Config */}
                  <div className="pt-2">
                    <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest transition-all">
                      {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      {showAdvanced ? 'Thu gọn' : 'Cấu hình lãi suất (Tự động ghi nhớ)'}
                    </button>
                    {showAdvanced && (
                      <div className="space-y-4 pt-4 animate-in fade-in duration-300">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">SĐT KHÁCH</label>
                            <input value={formCustomerPhone} onChange={(e) => setFormCustomerPhone(e.target.value)} type="tel" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">LÃI (K/1TR)</label>
                            <input value={formInterestRate} onChange={(e) => setFormInterestRate(e.target.value)} type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">HẠN (NGÀY)</label>
                            <input value={formDuration} onChange={(e) => setFormDuration(e.target.value)} type="number" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase">NGÀY CẦM</label>
                            <input value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} type="date" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs" />
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2">
                          <Save className="w-3 h-3 text-emerald-600" />
                          <span className="text-[9px] font-bold text-emerald-700">Thông số lãi & hạn sẽ được lưu lại cho các hợp đồng sau.</span>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">GHI CHÚ</label>
                          <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={2} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium resize-none" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => { clearForm(); setView('contracts'); }} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl uppercase tracking-widest text-xs">Hủy</button>
                    <button type="submit" className="flex-[2] py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-emerald-500/30 flex items-center justify-center gap-2 text-xs active:scale-95 transition-transform">
                      <CheckCircle className="w-5 h-5" /> {editingContractId ? 'Cập Nhật' : 'Xác Nhận'}
                    </button>
                  </div>
                </form>
             </div>
          </div>
        )}
      </main>

      {/* DRAWER ACTION MODAL */}
      {quickActionModal.contract && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <div className="bg-white w-full rounded-[3rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-8 pb-4 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-3 h-10 bg-emerald-500 rounded-full"></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                    {quickActionModal.type === 'interest' ? 'Đóng Tiền Lãi' : 
                     quickActionModal.type === 'redeem' ? 'Chuộc Máy' : 
                     quickActionModal.type === 'add_principal' ? 'Lấy Thêm Gốc' :
                     quickActionModal.type === 'reduce_principal' ? 'Trả Bớt Gốc' :
                     'Thông Tin Hợp Đồng'}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{quickActionModal.contract.id}</p>
                </div>
              </div>
              <button onClick={() => setQuickActionModal({ type: 'details', contract: null })} className="p-3 bg-slate-100 rounded-full active:scale-90 transition-transform">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="px-8 pb-12 overflow-y-auto flex-1 no-scrollbar">
              {quickActionModal.type === 'details' && (
                <div className="space-y-8 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Tiền gốc hiện tại</p>
                      <p className="text-2xl font-black text-emerald-700">{formatVND(quickActionModal.contract.loanAmount)}</p>
                    </div>
                    <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100">
                      <p className="text-[10px] font-black text-amber-600 uppercase mb-2">Lãi đến hôm nay</p>
                      <p className="text-2xl font-black text-amber-700">
                        {formatVND(calculateInterest(quickActionModal.contract.loanAmount, quickActionModal.contract.interestRate, quickActionModal.contract.startDate, quickActionModal.contract.interestType, quickActionModal.contract.lastInterestPaidDate, quickActionModal.contract.residualInterest))}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-6 h-6 text-slate-800" />
                        <p className="text-lg font-black text-slate-800">{quickActionModal.contract.device.model}</p>
                      </div>
                      <StatusBadge status={quickActionModal.contract.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-y-4 text-xs">
                      <p><span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Ngày cầm</span> {formatDate(quickActionModal.contract.startDate)}</p>
                      <p><span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Đáo hạn</span> {formatDate(quickActionModal.contract.dueDate)}</p>
                      <p><span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Lãi suất</span> {quickActionModal.contract.interestRate}k / 1tr</p>
                      <p><span className="text-slate-400 font-bold uppercase text-[9px] block mb-1">Giấy tờ</span> {quickActionModal.contract.isNoPaper ? 'Ko giấy' : 'Có giấy'}</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 pb-10">
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'interest' })} className="py-4.5 bg-emerald-500 text-white font-black rounded-2xl uppercase text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                        <Receipt className="w-4 h-4" /> Đóng lãi gia hạn
                      </button>
                      <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'redeem' })} className="py-4.5 bg-blue-500 text-white font-black rounded-2xl uppercase text-xs flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                        <CheckCircle className="w-4 h-4" /> Chuộc máy
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <button onClick={() => startEditing(quickActionModal.contract!)} className="py-3 bg-slate-100 text-slate-600 font-black rounded-xl uppercase text-[9px] flex items-center justify-center gap-1 active:bg-slate-200">
                        <Edit2 className="w-3 h-3" /> Sửa
                      </button>
                      <button onClick={() => handleStatusUpdate(quickActionModal.contract!.id, ContractStatus.LIQUIDATED)} className="py-3 bg-amber-50 text-amber-600 font-black rounded-xl uppercase text-[9px] flex items-center justify-center gap-1 border active:bg-amber-100">
                        <TrendingDown className="w-3 h-3" /> T.Lý
                      </button>
                      <button onClick={() => deleteContract(quickActionModal.contract!.id)} className="py-3 bg-rose-50 text-rose-600 font-black rounded-xl uppercase text-[9px] flex items-center justify-center gap-1 border active:bg-rose-100">
                        <Trash2 className="w-3 h-3" /> Xóa HD
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {quickActionModal.type === 'interest' && (
                <div className="space-y-6 pt-4">
                  <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 text-center">
                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">Số lãi dự kiến cần thu</p>
                    <h4 className="text-4xl font-black text-emerald-700">
                      {formatVND(calculateInterest(quickActionModal.contract!.loanAmount, quickActionModal.contract!.interestRate, quickActionModal.contract!.startDate, quickActionModal.contract!.interestType, quickActionModal.contract!.lastInterestPaidDate, quickActionModal.contract!.residualInterest))}
                    </h4>
                  </div>
                  <div className="space-y-3 px-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Số tiền khách đóng thực tế</label>
                    <input autoFocus value={interestPaidAmount} onChange={(e) => setInterestPaidAmount(formatNumber(Number(e.target.value.replace(/\D/g, ""))))} className="w-full px-8 py-6 bg-slate-900 border-none rounded-[2rem] outline-none font-black text-white text-4xl text-center focus:ring-4 focus:ring-emerald-500/20" />
                  </div>
                  <div className="flex gap-4 pt-4 pb-12">
                    <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'details' })} className="flex-1 py-5 bg-slate-100 text-slate-400 font-black rounded-3xl uppercase tracking-widest text-sm">Hủy</button>
                    <button onClick={() => handlePayInterest(quickActionModal.contract!.id)} className="flex-[2] py-5 bg-emerald-500 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl text-sm active:scale-95 transition-transform">Xác nhận</button>
                  </div>
                </div>
              )}

              {quickActionModal.type === 'redeem' && (
                <div className="space-y-8 pt-4">
                  <div className="py-12 bg-blue-50 rounded-[3rem] border border-blue-100 text-center px-6">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3">Tổng cộng thanh toán để chuộc</p>
                    <h4 className="text-5xl font-black text-blue-700">
                      {formatVND(quickActionModal.contract.loanAmount + calculateInterest(quickActionModal.contract.loanAmount, quickActionModal.contract.interestRate, quickActionModal.contract.startDate, quickActionModal.contract.interestType, quickActionModal.contract.lastInterestPaidDate, quickActionModal.contract.residualInterest))}
                    </h4>
                  </div>
                  <div className="flex gap-4 pb-12">
                    <button onClick={() => setQuickActionModal({ ...quickActionModal, type: 'details' })} className="flex-1 py-5 bg-slate-100 text-slate-400 font-black rounded-3xl uppercase tracking-widest text-sm">Quay lại</button>
                    <button onClick={() => handleStatusUpdate(quickActionModal.contract!.id, ContractStatus.REDEEMED)} className="flex-[2] py-5 bg-blue-500 text-white font-black rounded-3xl uppercase tracking-widest shadow-xl text-sm active:scale-95 transition-transform">Xác nhận chuộc</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
        <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${view === 'dashboard' ? 'text-emerald-500' : 'text-slate-400'}`}>
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase">Home</span>
        </button>
        <button onClick={() => { setView('contracts'); setStatusFilter('ALL'); }} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${view === 'contracts' ? 'text-emerald-500' : 'text-slate-400'}`}>
          <History className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase">Sổ Cầm</span>
        </button>
        <button onClick={() => { clearForm(); setView('add'); }} className="flex-1 flex justify-center -mt-8 pointer-events-none">
           <div onClick={() => { clearForm(); setView('add'); }} className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-90 pointer-events-auto ${view === 'add' ? 'bg-slate-900 text-emerald-400' : 'bg-emerald-500 text-white'}`}>
             <PlusCircle className="w-8 h-8" />
           </div>
        </button>
        <button onClick={() => setView('overdue')} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${view === 'overdue' ? 'text-emerald-500' : 'text-slate-400'}`}>
          <AlertTriangle className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase">Quá hạn</span>
        </button>
        <button onClick={() => setView('customers')} className={`flex flex-col items-center gap-1 flex-1 transition-colors ${view === 'customers' ? 'text-emerald-500' : 'text-slate-400'}`}>
          <Contact2 className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase">Khách</span>
        </button>
      </nav>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
        .py-4.5 { padding-top: 1.125rem; padding-bottom: 1.125rem; }
      `}</style>
    </div>
  );
};

export default App;
