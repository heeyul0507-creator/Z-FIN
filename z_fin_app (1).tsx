import React, { useState, useEffect, useMemo } from 'react';
import { Settings, Home, PiggyBank, History, Plus, Trash2, Calendar as CalendarIcon, Check, Copy } from 'lucide-react';

const CATEGORIES = ['월세', '전기세', '수도세', '관리비', '간식비', '생활용품', '식비', '취미&여가', '교통비', '계좌이체', '기타'];

// Utility to get today's date in YYYY-MM-DD format
const getTodayStr = () => {
  const tzOffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, 10);
  return localISOTime;
};

// Calculate days between two dates (inclusive)
const getDaysBetween = (start, end) => {
  if (!start || !end) return 1;
  const d1 = new Date(start);
  const d2 = new Date(end);
  const diffTime = d2.getTime() - d1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays > 0 ? diffDays : 1;
};

// Custom Hook for localStorage
function useStickyState(defaultValue, key) {
  const [value, setValue] = useState(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');

  // Global States
  const [period, setPeriod] = useStickyState({ startDate: getTodayStr(), endDate: getTodayStr() }, 'zfin_period');
  const [income, setIncome] = useStickyState(0, 'zfin_income');
  const [targetSavings, setTargetSavings] = useStickyState(0, 'zfin_targetSavings');
  const [fixedExpenses, setFixedExpenses] = useStickyState([], 'zfin_fixedExpenses');
  const [expectedExpenses, setExpectedExpenses] = useStickyState([], 'zfin_expectedExpenses');
  const [transactions, setTransactions] = useStickyState([], 'zfin_transactions');
  const [pig, setPig] = useStickyState({ name: '꿀꿀이', fedAmount: 0 }, 'zfin_pig');
  const [dailyFed, setDailyFed] = useStickyState({}, 'zfin_dailyFed');
  const [pigFarm, setPigFarm] = useStickyState([], 'zfin_pigFarm');

  // Auto-Archive Logic
  useEffect(() => {
    const todayStr = getTodayStr();
    if (period.endDate && todayStr > period.endDate && pig.fedAmount > 0) {
      // Calculate final weight
      const perc = targetSavings > 0 ? (pig.fedAmount / targetSavings) * 100 : 0;
      let finalWeight = 20;
      if (perc >= 20 && perc < 40) finalWeight = 40;
      else if (perc >= 40 && perc < 60) finalWeight = 60;
      else if (perc >= 60 && perc < 80) finalWeight = 80;
      else if (perc >= 80) finalWeight = 100;

      const newPigRecord = {
        id: Date.now(),
        name: pig.name || '이름 없는 돼지',
        weight: finalWeight,
        startDate: period.startDate,
        endDate: period.endDate,
        fedAmount: pig.fedAmount,
        targetAmount: targetSavings
      };

      setPigFarm(prev => [...prev, newPigRecord]);
      setPig(prev => ({ ...prev, fedAmount: 0 }));
      setTransactions([]);
      setDailyFed({});
      // Set new period to start from today to prevent infinite archiving loop
      setPeriod({ startDate: todayStr, endDate: todayStr });
    }
  }, [period.endDate, pig, targetSavings, setPigFarm, setPig, setTransactions, setDailyFed, setPeriod]);

  // Derived Values
  const totalFixedExpenses = useMemo(() => fixedExpenses.reduce((sum, item) => sum + Number(item.amount), 0), [fixedExpenses]);
  const totalExpectedExpenses = useMemo(() => expectedExpenses.reduce((sum, item) => sum + Number(item.amount), 0), [expectedExpenses]);
  const availableBudget = income - totalFixedExpenses - targetSavings;
  const totalDays = getDaysBetween(period.startDate, period.endDate);
  const dailyMax = Math.max(0, Math.floor(availableBudget / totalDays));

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-gray-50 font-sans shadow-2xl relative overflow-hidden text-gray-800">
      {/* Header */}
      <header className="bg-emerald-600 text-white p-4 shadow-md flex justify-between items-center z-10">
        <h1 className="text-2xl font-bold tracking-wider">Z-FIN</h1>
        <span className="text-xs opacity-80">{period.startDate} ~ {period.endDate}</span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'settings' && (
          <SettingsTab 
            period={period} setPeriod={setPeriod}
            income={income} setIncome={setIncome}
            targetSavings={targetSavings} setTargetSavings={setTargetSavings}
            fixedExpenses={fixedExpenses} setFixedExpenses={setFixedExpenses}
            expectedExpenses={expectedExpenses} setExpectedExpenses={setExpectedExpenses}
            availableBudget={availableBudget} totalExpectedExpenses={totalExpectedExpenses}
          />
        )}
        {activeTab === 'home' && (
          <HomeTab 
            period={period} 
            dailyMax={dailyMax}
            transactions={transactions} setTransactions={setTransactions}
            dailyFed={dailyFed}
          />
        )}
        {activeTab === 'mypig' && (
          <MyPigTab 
            pig={pig} setPig={setPig}
            targetSavings={targetSavings}
            dailyMax={dailyMax}
            transactions={transactions}
            dailyFed={dailyFed} setDailyFed={setDailyFed}
          />
        )}
        {activeTab === 'farm' && (
          <PigFarmTab pigFarm={pigFarm} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 w-full bg-white border-t border-gray-200 flex justify-around p-3 z-10">
        <NavButton icon={<Settings size={24} />} label="설정" isActive={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        <NavButton icon={<Home size={24} />} label="홈화면" isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
        <NavButton icon={<PiggyBank size={24} />} label="My 돼지" isActive={activeTab === 'mypig'} onClick={() => setActiveTab('mypig')} />
        <NavButton icon={<History size={24} />} label="돼지 농장" isActive={activeTab === 'farm'} onClick={() => setActiveTab('farm')} />
      </nav>
    </div>
  );
}

function NavButton({ icon, label, isActive, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center transition-colors duration-200 ${isActive ? 'text-emerald-600' : 'text-gray-400 hover:text-emerald-500'}`}
    >
      {icon}
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );
}

function SettingsTab({ period, setPeriod, income, setIncome, targetSavings, setTargetSavings, fixedExpenses, setFixedExpenses, expectedExpenses, setExpectedExpenses, availableBudget, totalExpectedExpenses }) {
  
  const addExpense = (setter) => {
    setter(prev => [...prev, { id: Date.now(), category: CATEGORIES[0], name: '', amount: 0 }]);
  };

  const updateExpense = (setter, id, field, value) => {
    setter(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeExpense = (setter, id) => {
    setter(prev => prev.filter(item => item.id !== id));
  };

  const renderExpenseSection = (title, items, setter) => (
    <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-700">{title}</h3>
        <button onClick={() => addExpense(setter)} className="text-emerald-600 flex items-center text-sm font-medium">
          <Plus size={16} className="mr-1"/> 추가
        </button>
      </div>
      {items.map(item => (
        <div key={item.id} className="flex gap-2 mb-2 items-center">
          <select 
            value={item.category} 
            onChange={(e) => updateExpense(setter, item.id, 'category', e.target.value)}
            className="p-2 border rounded-lg text-sm bg-gray-50 flex-1"
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input 
            type="text" placeholder="내용" value={item.name} 
            onChange={(e) => updateExpense(setter, item.id, 'name', e.target.value)}
            className="p-2 border rounded-lg text-sm bg-gray-50 flex-1 w-20"
          />
          <input 
            type="number" placeholder="금액" value={item.amount || ''} 
            onChange={(e) => updateExpense(setter, item.id, 'amount', Number(e.target.value))}
            className="p-2 border rounded-lg text-sm bg-gray-50 flex-1 w-24"
          />
          <button onClick={() => removeExpense(setter, item.id)} className="text-red-400 p-1">
            <Trash2 size={18} />
          </button>
        </div>
      ))}
      {items.length === 0 && <p className="text-xs text-gray-400 text-center py-2">항목이 없습니다.</p>}
    </div>
  );

  return (
    <div className="p-4 animate-fadeIn">
      <h2 className="text-xl font-bold mb-4 text-emerald-800">설정 및 분석</h2>
      
      <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
        <label className="block text-sm font-bold text-gray-600 mb-1">원하는 주기 (시작 ~ 끝)</label>
        <div className="flex gap-2 items-center">
          <input type="date" value={period.startDate} onChange={(e) => setPeriod({...period, startDate: e.target.value})} className="p-2 border rounded-lg flex-1 text-sm"/>
          <span className="text-gray-400">~</span>
          <input type="date" value={period.endDate} onChange={(e) => setPeriod({...period, endDate: e.target.value})} className="p-2 border rounded-lg flex-1 text-sm"/>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm mb-4 space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1">주기별 소득량 (원)</label>
          <input type="number" value={income || ''} onChange={(e) => setIncome(Number(e.target.value))} className="w-full p-3 border rounded-lg text-lg font-bold text-emerald-700 bg-gray-50"/>
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-600 mb-1">희망 비용 (모으고 싶은 돈)</label>
          <input type="number" value={targetSavings || ''} onChange={(e) => setTargetSavings(Number(e.target.value))} className="w-full p-3 border rounded-lg text-lg font-bold text-emerald-700 bg-gray-50"/>
        </div>
      </div>

      {renderExpenseSection('고정 지출 (무조건 나가는 비용)', fixedExpenses, setFixedExpenses)}
      {renderExpenseSection('예상 지출', expectedExpenses, setExpectedExpenses)}

      {/* Calculation Summary */}
      <div className={`p-4 rounded-xl shadow-sm mb-4 ${availableBudget < totalExpectedExpenses ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}>
        <h3 className="font-bold mb-2">분석 결과</h3>
        <p className="text-sm flex justify-between mb-1"><span>사용 가능 예산:</span> <span>{availableBudget.toLocaleString()}원</span></p>
        <p className="text-sm flex justify-between mb-1"><span>총 예상 지출:</span> <span>{totalExpectedExpenses.toLocaleString()}원</span></p>
        <div className="mt-3 pt-3 border-t border-gray-300">
          {availableBudget < totalExpectedExpenses ? (
            <p className="text-red-600 font-bold text-sm text-center">
              🚨 목표 달성을 위해 예상 지출에서 <br/>
              <span className="text-lg underline underline-offset-2">{(totalExpectedExpenses - availableBudget).toLocaleString()}원</span>을 줄여야 합니다!
            </p>
          ) : (
            <p className="text-emerald-600 font-bold text-sm text-center">
              ✅ 훌륭합니다! 현재 계획대로라면 목표를 달성할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeTab({ period, dailyMax, transactions, setTransactions, dailyFed }) {
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  
  // Daily logic
  const todayTransactions = transactions.filter(t => t.date === selectedDate);
  const spentToday = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  
  // If the user is looking at the actual 'today', we calculate remaining considering if fed.
  // We'll calculate it contextually for the selectedDate.
  const isFed = dailyFed[selectedDate] || false;
  const remaining = isFed ? 0 : Math.max(0, dailyMax - spentToday);

  // Calendar logic
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push(dateStr);
    }
    return days;
  };

  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

  return (
    <div className="p-4 animate-fadeIn">
      {/* Daily Budget Display */}
      <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-lg mb-6 flex flex-col items-center justify-center">
        <p className="text-sm font-medium opacity-90 mb-1">{selectedDate} 가용 금액</p>
        <div className="text-3xl font-bold tracking-tight">
          {remaining.toLocaleString()} <span className="text-xl font-normal opacity-80">/ {dailyMax.toLocaleString()}원</span>
        </div>
        {isFed && <p className="text-xs mt-2 bg-white/20 px-3 py-1 rounded-full">오늘은 돼지에게 밥을 줬어요! 🐷</p>}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">&lt;</button>
          <span className="font-bold text-gray-700">{currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월</span>
          <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-gray-400 font-medium">
          <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {generateCalendar().map((date, idx) => (
            <div key={idx} className="aspect-square flex items-center justify-center">
              {date ? (
                <button
                  onClick={() => setSelectedDate(date)}
                  className={`w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors
                    ${selectedDate === date ? 'bg-emerald-500 text-white font-bold shadow-md' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {parseInt(date.split('-')[2], 10)}
                </button>
              ) : <div />}
            </div>
          ))}
        </div>
      </div>

      {/* Record Input Area */}
      <TransactionRecorder 
        selectedDate={selectedDate}
        transactions={transactions}
        setTransactions={setTransactions}
      />
    </div>
  );
}

function TransactionRecorder({ selectedDate, transactions, setTransactions }) {
  const [rawText, setRawText] = useState('');
  const [manualLoc, setManualLoc] = useState('');
  const [manualAmt, setManualAmt] = useState('');
  
  // Simple regex parser for Korean SMS patterns
  const parseText = () => {
    if (!rawText) return;
    // Look for numbers followed by 원
    const amtMatch = rawText.match(/([0-9,]+)\s*원/);
    // Rough heuristic for location: text before the amount, or just pick first word
    let amount = 0;
    if (amtMatch) {
      amount = parseInt(amtMatch[1].replace(/,/g, ''), 10);
    }
    
    // Set to manual fields for user verification
    setManualAmt(amount || '');
    // Try to guess location roughly
    const locMatch = rawText.split(' ').find(w => w.length > 1 && !w.includes(/[0-9]/) && !w.includes('원'));
    setManualLoc(locMatch || '직접 입력 요망');
    
    setRawText('');
  };

  const addTransaction = () => {
    if (!manualLoc || !manualAmt) return;
    const newTx = {
      id: Date.now(),
      date: selectedDate,
      location: manualLoc,
      amount: Number(manualAmt)
    };
    setTransactions(prev => [...prev, newTx]);
    setManualLoc('');
    setManualAmt('');
  };

  const removeTx = (id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const todayTxs = transactions.filter(t => t.date === selectedDate);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
        <CalendarIcon size={18}/> {selectedDate} 지출 기록
      </h3>
      
      {/* Auto Parser */}
      <div className="mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
        <label className="text-xs font-bold text-gray-500 mb-1 block">문자 복사 붙여넣기</label>
        <div className="flex gap-2">
          <textarea 
            value={rawText} 
            onChange={e => setRawText(e.target.value)}
            placeholder="결제 문자를 붙여넣고 분석을 누르세요"
            className="flex-1 border p-2 text-sm rounded-lg resize-none h-10"
          />
          <button onClick={parseText} className="bg-gray-800 text-white px-3 text-sm rounded-lg whitespace-nowrap hover:bg-gray-700">분석</button>
        </div>
      </div>

      {/* Manual Input */}
      <div className="mb-4 flex gap-2">
        <input 
          type="text" placeholder="사용처 (위치)" 
          value={manualLoc} onChange={e => setManualLoc(e.target.value)}
          className="flex-1 border p-2 text-sm rounded-lg"
        />
        <input 
          type="number" placeholder="금액" 
          value={manualAmt} onChange={e => setManualAmt(e.target.value)}
          className="w-24 border p-2 text-sm rounded-lg"
        />
        <button onClick={addTransaction} className="bg-emerald-500 text-white px-3 text-sm rounded-lg whitespace-nowrap hover:bg-emerald-600">추가</button>
      </div>

      {/* Transaction List */}
      <div className="space-y-2 mt-4">
        {todayTxs.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-4">지출 내역이 없습니다.</p>
        ) : (
          todayTxs.map(tx => (
            <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
              <span className="font-medium text-gray-700">**{tx.location}</span>
              <div className="flex items-center gap-3">
                <span className="text-red-500 font-bold">-{tx.amount.toLocaleString()}원</span>
                <button onClick={() => removeTx(tx.id)} className="text-gray-400 hover:text-red-400"><Trash2 size={16}/></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MyPigTab({ pig, setPig, targetSavings, dailyMax, transactions, dailyFed, setDailyFed }) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(pig.name);

  // Compute today's remaining
  const todayStr = getTodayStr();
  const todayTransactions = transactions.filter(t => t.date === todayStr);
  const spentToday = todayTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const isFedToday = dailyFed[todayStr] || false;
  const remainingToday = Math.max(0, dailyMax - spentToday);

  const saveName = () => {
    setPig(prev => ({ ...prev, name: tempName }));
    setEditingName(false);
  };

  const feedPig = () => {
    if (isFedToday || remainingToday <= 0 || targetSavings <= 0) return;
    
    // Cap feed amount to not exceed targetSavings if desired, but prompt says "먹을 수 있는 최대 금액은 사용자가 정한 '희망 비용'입니다"
    let newAmount = pig.fedAmount + remainingToday;
    if (newAmount > targetSavings) newAmount = targetSavings;

    setPig(prev => ({ ...prev, fedAmount: newAmount }));
    setDailyFed(prev => ({ ...prev, [todayStr]: true }));
  };

  // Weight Calculation
  const perc = targetSavings > 0 ? (pig.fedAmount / targetSavings) * 100 : 0;
  let weight = 20;
  if (perc >= 20 && perc < 40) weight = 40;
  else if (perc >= 40 && perc < 60) weight = 60;
  else if (perc >= 60 && perc < 80) weight = 80;
  else if (perc >= 80) weight = 100;

  return (
    <div className="p-6 animate-fadeIn flex flex-col h-full">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-emerald-800">My 돼지 키우기</h2>
        <p className="text-sm text-gray-500 mt-1">남은 돈을 먹여 돼지를 살찌워요!</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {/* Pig Image */}
        <div className="relative mb-6 transform transition-transform duration-500 hover:scale-105">
          <img 
            src="https://png.pngtree.com/png-vector/20250724/ourlarge/pngtree-cute-piggy-character-illustration-in-cartoon-style-png-image_16684685.webp" 
            alt="Pig" 
            className="w-48 h-48 object-contain drop-shadow-xl"
            style={{ transform: `scale(${1 + (weight - 20) * 0.005})` }} // Slight visual growth
          />
          {isFedToday && (
            <div className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce">
              배불러요! 💖
            </div>
          )}
        </div>

        {/* Pig Name and Weight */}
        <div className="flex items-center gap-2 mb-2">
          {editingName ? (
            <div className="flex items-center gap-1">
              <input 
                value={tempName} onChange={e => setTempName(e.target.value)} 
                className="border-b-2 border-emerald-500 bg-transparent text-xl font-bold text-center w-32 outline-none focus:ring-0 px-1 text-gray-700"
                autoFocus
              />
              <button onClick={saveName} className="text-emerald-600 bg-emerald-100 p-1 rounded-full"><Check size={16}/></button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-700" onDoubleClick={() => setEditingName(true)}>
                {pig.name} <span className="text-emerald-600">({weight}kg)</span>
              </span>
              <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-emerald-500"><Settings size={14}/></button>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xs mt-4">
          <div className="flex justify-between text-xs font-bold text-gray-500 mb-1">
            <span>{pig.fedAmount.toLocaleString()}원</span>
            <span>{targetSavings > 0 ? targetSavings.toLocaleString() : '목표액 설정 필요'}원</span>
          </div>
          <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out"
              style={{ width: `${Math.min(100, perc)}%` }}
            />
          </div>
          <div className="text-center text-xs mt-2 text-emerald-700 font-bold">
            달성률: {perc.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Feed Action Area */}
      <div className="mt-8 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
        <p className="text-sm text-gray-600 mb-3">오늘 남은 금액: <strong className="text-emerald-600 text-lg">{remainingToday.toLocaleString()}원</strong></p>
        <button 
          onClick={feedPig}
          disabled={isFedToday || remainingToday <= 0 || targetSavings <= 0}
          className={`w-full py-3 rounded-xl font-bold text-white transition-all transform active:scale-95 flex items-center justify-center gap-2
            ${isFedToday 
              ? 'bg-gray-400 cursor-not-allowed' 
              : remainingToday <= 0 
                ? 'bg-red-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-md hover:shadow-lg'}`}
        >
          <PiggyBank size={20}/>
          {targetSavings <= 0 ? '목표액을 설정하세요' 
            : isFedToday ? '오늘은 이미 밥을 줬어요' 
              : remainingToday <= 0 ? '오늘은 남은 돈이 없어요 😢' 
                : '오늘 남은 돈 먹이기'}
        </button>
      </div>
    </div>
  );
}

function PigFarmTab({ pigFarm }) {
  return (
    <div className="p-4 animate-fadeIn h-full">
      <div className="flex items-center gap-2 mb-6 text-emerald-800">
        <History size={24} />
        <h2 className="text-xl font-bold">돼지 농장 (기록실)</h2>
      </div>

      {pigFarm.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <PiggyBank size={48} className="mb-4 opacity-50" />
          <p className="text-sm">아직 농장으로 보낸 돼지가 없습니다.</p>
          <p className="text-xs mt-1">주기가 끝나면 돼지가 자동으로 농장으로 옵니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {pigFarm.slice().reverse().map(p => (
            <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-emerald-100 flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center flex-shrink-0">
                <img 
                  src="https://png.pngtree.com/png-vector/20250724/ourlarge/pngtree-cute-piggy-character-illustration-in-cartoon-style-png-image_16684685.webp" 
                  alt="Pig" 
                  className="w-12 h-12 object-contain"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  {p.name} <span className="text-sm bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{p.weight}kg</span>
                </h3>
                <p className="text-xs text-gray-500 mt-1">{p.startDate} ~ {p.endDate}</p>
                <p className="text-xs font-medium text-emerald-600 mt-1">
                  모은 돈: {p.fedAmount.toLocaleString()}원 / {p.targetAmount.toLocaleString()}원
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}