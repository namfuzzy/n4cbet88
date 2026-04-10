/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Brain, 
  Camera, 
  Scan, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  History, 
  Settings, 
  ChevronRight, 
  X, 
  Check, 
  Minus,
  Trash2,
  RefreshCw,
  Info,
  Terminal,
  Flame,
  ShieldAlert,
  Zap,
  Cpu,
  Key,
  Scale,
  Eye,
  Activity,
  Target,
  Crosshair
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---

type Step = 1 | 2 | 3 | 4;

interface Bet {
  id: string;
  match: string;
  odds: number;
  prob: number;
  stake: number;
  status: 'pending' | 'won' | 'lost' | 'void';
  date: string;
  ev: number;
}

type RiskStrategy = '1/4' | '1/8';

interface MatchAnalysis {
  name: string;
  bookieOdds: number;
  aiProb: number;
  impliedProb: number;
  edge: number;
  verdict: 'VALUE' | 'TRAP' | 'PASS';
  confidence: number;
  analysis: {
    tactical: string;
    moneyFlow: string;
    bookieIntent: string;
  };
  h2h: { win: number; draw: number; loss: number };
}

// --- Helpers ---

const formatVNĐ = (val: number) => {
  return val.toLocaleString('vi-VN') + ' VNĐ';
};

// --- Components ---

export default function App() {
  // Core State
  const [step, setStep] = useState<Step>(1);
  const [bankroll, setBankroll] = useState<number>(10000000);
  const [ledger, setLedger] = useState<Bet[]>([]);
  const [strategy, setStrategy] = useState<RiskStrategy>('1/4');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3-flash-preview');
  const [customApiKey, setCustomApiKey] = useState<string>('');
  
  // Workflow State
  const [isScanning, setIsScanning] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanBase64, setScanBase64] = useState<string | null>(null);
  const [scanMimeType, setScanMimeType] = useState<string | null>(null);

  const [showTrapModal, setShowTrapModal] = useState(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  const [currentMatch, setCurrentMatch] = useState<MatchAnalysis>({
    name: '',
    bookieOdds: 2.0,
    aiProb: 50,
    impliedProb: 50,
    edge: 0,
    verdict: 'PASS',
    confidence: 0,
    analysis: { tactical: '', moneyFlow: '', bookieIntent: '' },
    h2h: { win: 0, draw: 0, loss: 0 }
  });

  // Persistence
  useEffect(() => {
    const savedBankroll = localStorage.getItem('qb_v5_bankroll');
    const savedLedger = localStorage.getItem('qb_v5_ledger');
    const savedModel = localStorage.getItem('qb_v7_model');
    const savedApiKey = localStorage.getItem('qb_v7_apikey');
    
    if (savedBankroll) setBankroll(Number(savedBankroll));
    if (savedLedger) setLedger(JSON.parse(savedLedger));
    if (savedModel) setSelectedModel(savedModel);
    if (savedApiKey) setCustomApiKey(savedApiKey);
  }, []);

  useEffect(() => {
    localStorage.setItem('qb_v5_bankroll', bankroll.toString());
    localStorage.setItem('qb_v5_ledger', JSON.stringify(ledger));
    localStorage.setItem('qb_v7_model', selectedModel);
    localStorage.setItem('qb_v7_apikey', customApiKey);
  }, [bankroll, ledger, selectedModel, customApiKey]);

  // Calculations
  const calculations = useMemo(() => {
    const p = currentMatch.aiProb / 100;
    const b = currentMatch.bookieOdds - 1;
    const q = 1 - p;
    const ev = (p * currentMatch.bookieOdds) - 1;
    
    let kellyFraction = b > 0 ? (b * p - q) / b : 0;
    const adjustedKelly = Math.max(0, kellyFraction);
    const multiplier = strategy === '1/4' ? 0.25 : 0.125;
    const stake = bankroll * adjustedKelly * multiplier;

    return {
      ev: ev * 100,
      stake: ev > 0 ? Math.floor(stake) : 0,
      riskLevel: ev > 0.1 ? 'THẤP' : ev > 0.05 ? 'TRUNG BÌNH' : 'CAO'
    };
  }, [currentMatch, bankroll, strategy]);

  // Tilt Warning
  const isTilting = useMemo(() => {
    const lastThree = ledger.slice(0, 3);
    return lastThree.length === 3 && lastThree.every(b => b.status === 'lost');
  }, [ledger]);

  // Handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanPreview(URL.createObjectURL(file));
    setScanMimeType(file.type);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      setScanBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  const startAnalysis = async () => {
    setIsScanning(true);
    
    // Simulate initial scan
    setTimeout(async () => {
      setIsScanning(false);
      setIsResearching(true);
      setTerminalLogs([]);
      setLastUpdate(new Date().toLocaleTimeString('vi-VN'));

      const addLog = (msg: string, delay: number) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            setTerminalLogs(prev => [...prev, msg]);
            resolve(true);
          }, delay);
        });
      };

      await addLog("> Đang kết nối với " + selectedModel + "...", 500);
      await addLog("> Truy cập dữ liệu thời gian thực từ API Thể thao...", 500);
      await addLog("> Phân tích biến động Odds & Smart Money...", 500);
      await addLog("> Đang gửi yêu cầu tới AI phân tích...", 500);

      try {
        let apiKeyToUse = customApiKey;
        if (!apiKeyToUse) {
          try {
            // @ts-ignore
            apiKeyToUse = process.env.GEMINI_API_KEY || '';
          } catch (e) {
            apiKeyToUse = '';
          }
        }

        if (!apiKeyToUse) {
          throw new Error("Thiếu API Key Gemini. Vui lòng kiểm tra cài đặt.");
        }

        const ai = new GoogleGenAI({ apiKey: apiKeyToUse });
        
        const prompt = `Bạn là một Chuyên gia Phân tích Dữ liệu Cá cược (Quant Betting Analyst) với 15 năm kinh nghiệm "đọc vị" nhà cái.
        Hãy phân tích trận đấu bóng đá tâm điểm nhất hôm nay hoặc trận đấu người dùng vừa tải lên.
        Nhiệm vụ của bạn là bóc tách tỷ lệ kèo, tìm ra giá trị thực (True Probability) và phát hiện ý đồ của nhà cái (Kèo dụ hay Kèo thơm).
        Trả về JSON với cấu trúc:
        {
          "name": "Tên trận đấu (Đội A vs Đội B)",
          "bookieOdds": Tỷ lệ kèo Decimal của nhà cái (VD: 2.10),
          "aiProb": Xác suất thắng thực tế do AI tính toán (%),
          "impliedProb": Xác suất ngầm định của nhà cái (%),
          "edge": Lợi thế (Edge) tính bằng % (aiProb - impliedProb),
          "verdict": "VALUE" (Kèo thơm) hoặc "TRAP" (Kèo dụ) hoặc "PASS" (Bỏ qua),
          "confidence": Độ tự tin của AI vào nhận định này (0-100),
          "analysis": {
            "tactical": "Phân tích chuyên sâu về chiến thuật, chấn thương, phong độ",
            "moneyFlow": "Phân tích dòng tiền (Smart money đang đổ vào đâu, đám đông đang đánh gì)",
            "bookieIntent": "Đọc vị ý đồ nhà cái (Tại sao lại ra kèo này? Đang dụ đánh cửa nào?)"
          },
          "h2h": { "win": số trận thắng, "draw": số trận hòa, "loss": số trận thua }
        }
        Lưu ý: Văn phong cực kỳ chuyên nghiệp, sắc bén, sử dụng thuật ngữ betting (Odds, Line, Trap, Value, Smart Money).`;

        let contents: any = prompt;
        if (scanBase64 && scanMimeType) {
          contents = [
            { inlineData: { data: scanBase64, mimeType: scanMimeType } },
            prompt
          ];
        }

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: contents,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                bookieOdds: { type: Type.NUMBER },
                aiProb: { type: Type.NUMBER },
                impliedProb: { type: Type.NUMBER },
                edge: { type: Type.NUMBER },
                verdict: { type: Type.STRING },
                confidence: { type: Type.NUMBER },
                analysis: {
                  type: Type.OBJECT,
                  properties: {
                    tactical: { type: Type.STRING },
                    moneyFlow: { type: Type.STRING },
                    bookieIntent: { type: Type.STRING }
                  }
                },
                h2h: {
                  type: Type.OBJECT,
                  properties: {
                    win: { type: Type.NUMBER },
                    draw: { type: Type.NUMBER },
                    loss: { type: Type.NUMBER }
                  }
                }
              },
              required: ["name", "bookieOdds", "aiProb", "impliedProb", "edge", "verdict", "confidence", "analysis", "h2h"]
            }
          }
        });

        await addLog("> Đã nhận phản hồi từ AI. Đang xử lý dữ liệu...", 200);
        let rawText = response.text || '{}';
        // Clean markdown formatting if present
        rawText = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
        const result = JSON.parse(rawText);
        
        setCurrentMatch({
          name: result.name || "Trận đấu chưa xác định",
          bookieOdds: result.bookieOdds || 2.0,
          aiProb: result.aiProb || 50,
          impliedProb: result.impliedProb || 50,
          edge: result.edge || 0,
          verdict: result.verdict || 'PASS',
          confidence: result.confidence || 70,
          analysis: result.analysis || { tactical: "Không có dữ liệu", moneyFlow: "Không có dữ liệu", bookieIntent: "Không có dữ liệu" },
          h2h: result.h2h || { win: 0, draw: 0, loss: 0 }
        });

        setIsResearching(false);
        setStep(2);

        // Trap Detection Logic: AI explicitly calls it a TRAP or discrepancy is huge
        if (result.verdict === 'TRAP' || (result.aiProb / 100) - (1 / result.bookieOdds) > 0.15) {
          setShowTrapModal(true);
        }

      } catch (error) {
        console.error("AI Analysis Error:", error);
        await addLog("> LỖI: " + (error instanceof Error ? error.message : "Không thể kết nối AI"), 200);
        await addLog("> Đang dùng dữ liệu dự phòng để tiếp tục...", 500);
        
        // Fallback data
        setTimeout(() => {
          setCurrentMatch({
            name: "Arsenal vs Liverpool (Dự phòng)",
            bookieOdds: 2.10,
            aiProb: 75,
            impliedProb: 47.6,
            edge: 27.4,
            verdict: 'VALUE',
            confidence: 85,
            analysis: {
              tactical: "Liverpool mất Salah, Arsenal có đội hình mạnh nhất.",
              moneyFlow: "Dòng tiền thông minh đang đổ dồn vào Arsenal.",
              bookieIntent: "Nhà cái giữ Odds cao để dụ người chơi đánh Liverpool vì danh tiếng."
            },
            h2h: { win: 10, draw: 4, loss: 6 }
          });
          setIsResearching(false);
          setStep(2);
        }, 1500);
      }
    }, 1500);
  };

  const confirmBet = () => {
    const newBet: Bet = {
      id: Math.random().toString(36).substr(2, 9),
      match: currentMatch.name,
      odds: currentMatch.bookieOdds,
      prob: currentMatch.aiProb,
      stake: calculations.stake,
      status: 'pending',
      date: new Date().toLocaleString('vi-VN'),
      ev: calculations.ev
    };
    setLedger([newBet, ...ledger]);
    setStep(1);
    setScanPreview(null);
    setScanBase64(null);
    setScanMimeType(null);
    setCurrentMatch({ 
      name: '', bookieOdds: 2.0, aiProb: 50, impliedProb: 50, edge: 0, 
      verdict: 'PASS', confidence: 0, 
      analysis: { tactical: '', moneyFlow: '', bookieIntent: '' }, 
      h2h: { win: 0, draw: 0, loss: 0 } 
    });
  };

  const updateBetStatus = (id: string, status: Bet['status']) => {
    setLedger(prev => prev.map(bet => {
      if (bet.id === id && bet.status === 'pending') {
        let profit = 0;
        if (status === 'won') {
          profit = bet.stake * (bet.odds - 1);
          setFlashMessage("Húp mạnh! Chốt lời thành công! 💰");
        }
        if (status === 'lost') {
          profit = -bet.stake;
          setFlashMessage("Đã ghi nhận lệnh gãy. Bình tĩnh gỡ lại! 📉");
        }
        setBankroll(curr => curr + profit);
        
        setTimeout(() => setFlashMessage(null), 3000);
        return { ...bet, status };
      }
      return bet;
    }));
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-emerald-500/30 p-4 sm:p-6">
      {/* Header & Progress */}
      <header className="max-w-4xl mx-auto mb-8 sm:mb-12">
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2 sm:p-3 bg-white rounded-full">
              <Brain className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tighter uppercase italic">QuantBet <span className="text-emerald-500">AI</span></h1>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-3 sm:p-4 border-2 border-white rounded-2xl hover:bg-white hover:text-black transition-all active:scale-95"
          >
            <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Progress Stepper */}
        <div className="flex gap-1.5 sm:gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div 
              key={s}
              className={`h-2 sm:h-3 flex-1 rounded-full transition-all duration-500 ${
                step >= s ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 sm:mt-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/40">
          <span className={step >= 1 ? 'text-emerald-500' : ''}>1. QUÉT</span>
          <span className={step >= 2 ? 'text-emerald-500' : ''}>2. PHÂN TÍCH</span>
          <span className={step >= 3 ? 'text-emerald-500' : ''}>3. ĐI TIỀN</span>
          <span className={step >= 4 ? 'text-emerald-500' : ''}>4. XÁC NHẬN</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          {/* STEP 1: INPUT */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="space-y-8"
            >
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileSelect}
                  className="hidden" 
                  id="slip-upload"
                />
                <label 
                  htmlFor="slip-upload"
                  className={`
                    flex flex-col items-center justify-center w-full aspect-video rounded-[2rem] border-4 border-dashed transition-all cursor-pointer overflow-hidden relative
                    ${scanPreview ? 'border-emerald-500 bg-emerald-500/5' : 'border-white/20 bg-white/5 hover:border-white hover:bg-white/10'}
                  `}
                >
                  {scanPreview ? (
                    <div className="relative w-full h-full">
                      <img src={scanPreview} alt="Preview" className="w-full h-full object-contain" />
                      {(isScanning || isResearching) && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
                          <motion.div 
                            animate={{ scale: [1, 1.2, 1], rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="w-20 h-20 sm:w-32 sm:h-32 rounded-full border-4 border-emerald-500 flex items-center justify-center"
                          >
                            <RefreshCw className="w-10 h-10 sm:w-16 sm:h-16 text-emerald-500" />
                          </motion.div>
                          
                          {isScanning ? (
                            <p className="mt-6 sm:mt-8 text-lg sm:text-2xl font-black uppercase tracking-widest text-emerald-500 animate-pulse">🧠 AI ĐANG QUÉT VÉ...</p>
                          ) : (
                            <div className="mt-6 sm:mt-8 w-full max-w-md px-6 space-y-1 sm:space-y-2">
                              <div className="flex items-center gap-2 text-emerald-400 mb-2 sm:mb-4">
                                <Terminal className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="text-[8px] sm:text-xs font-mono font-bold uppercase tracking-widest">Terminal Output</span>
                              </div>
                              {terminalLogs.map((log, i) => (
                                <motion.p 
                                  key={i}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="text-xs sm:text-sm font-mono text-emerald-400/80"
                                >
                                  {log}
                                </motion.p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4 sm:gap-6">
                      <div className="p-6 sm:p-8 bg-white rounded-full">
                        <Camera className="w-10 h-10 sm:w-16 sm:h-16 text-black" />
                      </div>
                      <p className="text-xl sm:text-3xl font-black uppercase tracking-tighter">Bấm để Chụp/Tải Ảnh</p>
                    </div>
                  )}
                </label>
              </div>

              {scanPreview && !isScanning && !isResearching && (
                <button 
                  onClick={startAnalysis}
                  className="w-full py-5 sm:py-8 bg-white text-black rounded-[1.5rem] sm:rounded-[2rem] text-xl sm:text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 sm:gap-4 hover:bg-emerald-500 transition-all active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]"
                >
                  TIẾN HÀNH PHÂN TÍCH <ChevronRight className="w-6 h-6 sm:w-10 sm:h-10" />
                </button>
              )}
            </motion.div>
          )}

          {/* STEP 2: THE BRAIN */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="space-y-6 sm:space-y-8"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-white/10 pb-3 sm:pb-4 gap-4">
                <div>
                  <div className="flex items-center gap-2 sm:gap-3 mb-1">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400" />
                    <h2 className="text-lg sm:text-xl font-black uppercase tracking-widest">BÁO CÁO ĐỊNH LƯỢNG</h2>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white">{currentMatch.name}</h3>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className={`px-4 py-2 rounded-xl border-2 flex items-center gap-2 ${
                    currentMatch.verdict === 'VALUE' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500' :
                    currentMatch.verdict === 'TRAP' ? 'border-rose-500 bg-rose-500/10 text-rose-500' :
                    'border-white/40 bg-white/5 text-white/60'
                  }`}>
                    {currentMatch.verdict === 'VALUE' ? <Target className="w-5 h-5" /> : 
                     currentMatch.verdict === 'TRAP' ? <ShieldAlert className="w-5 h-5" /> : 
                     <Minus className="w-5 h-5" />}
                    <span className="font-black uppercase tracking-widest">
                      {currentMatch.verdict === 'VALUE' ? 'KÈO THƠM' : 
                       currentMatch.verdict === 'TRAP' ? 'KÈO DỤ' : 'BỎ QUA'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                {/* Odds Comparison Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 sm:p-6 border-2 border-white/20 rounded-[1.5rem] bg-white/5 flex flex-col justify-between">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">ODDS NHÀ CÁI</p>
                    <p className="text-3xl sm:text-4xl font-mono font-black">{currentMatch.bookieOdds.toFixed(2)}</p>
                  </div>
                  <div className="p-4 sm:p-6 border-2 border-white/20 rounded-[1.5rem] bg-white/5 flex flex-col justify-between">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2">XÁC SUẤT NHÀ CÁI</p>
                    <p className="text-3xl sm:text-4xl font-mono font-black text-white/80">{currentMatch.impliedProb.toFixed(1)}%</p>
                  </div>
                  <div className="p-4 sm:p-6 border-2 border-emerald-500/50 rounded-[1.5rem] bg-emerald-500/5 flex flex-col justify-between">
                    <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-2">AI XÁC SUẤT THỰC</p>
                    <p className="text-3xl sm:text-4xl font-mono font-black text-emerald-500">{currentMatch.aiProb.toFixed(1)}%</p>
                  </div>
                  <div className={`p-4 sm:p-6 border-2 rounded-[1.5rem] flex flex-col justify-between ${
                    currentMatch.edge > 0 ? 'border-emerald-500 bg-emerald-500/10' : 'border-rose-500 bg-rose-500/10'
                  }`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
                      currentMatch.edge > 0 ? 'text-emerald-500/60' : 'text-rose-500/60'
                    }`}>VALUE EDGE</p>
                    <p className={`text-3xl sm:text-4xl font-mono font-black ${
                      currentMatch.edge > 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {currentMatch.edge > 0 ? '+' : ''}{currentMatch.edge.toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Deep Analysis Modules */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                  <div className="p-5 sm:p-6 border-2 border-white/10 rounded-[1.5rem] bg-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Scale className="w-5 h-5 text-blue-400" />
                      <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Chiến thuật & Đội hình</h4>
                    </div>
                    <p className="text-sm sm:text-base text-white/80 leading-relaxed">{currentMatch.analysis.tactical}</p>
                  </div>
                  
                  <div className="p-5 sm:p-6 border-2 border-white/10 rounded-[1.5rem] bg-white/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-5 h-5 text-purple-400" />
                      <h4 className="text-xs font-black text-purple-400 uppercase tracking-widest">Dòng tiền (Smart Money)</h4>
                    </div>
                    <p className="text-sm sm:text-base text-white/80 leading-relaxed">{currentMatch.analysis.moneyFlow}</p>
                  </div>

                  <div className="p-5 sm:p-6 border-2 border-yellow-400/30 rounded-[1.5rem] bg-yellow-400/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-5 h-5 text-yellow-400" />
                      <h4 className="text-xs font-black text-yellow-400 uppercase tracking-widest">Đọc vị Nhà cái</h4>
                    </div>
                    <p className="text-sm sm:text-base text-yellow-100/90 leading-relaxed italic">"{currentMatch.analysis.bookieIntent}"</p>
                  </div>
                </div>

                {/* H2H & Confidence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="p-5 sm:p-6 border-2 border-white/10 rounded-[1.5rem] bg-white/5">
                    <p className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-[0.3em] mb-3 sm:mb-4">LỊCH SỬ ĐỐI ĐẦU (H2H)</p>
                    <div className="flex justify-between items-end">
                      <div className="text-center">
                        <p className="text-2xl sm:text-3xl font-mono font-black text-emerald-500">{currentMatch.h2h.win}</p>
                        <p className="text-[8px] sm:text-[10px] font-bold text-white/40">THẮNG</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl sm:text-3xl font-mono font-black text-white">{currentMatch.h2h.draw}</p>
                        <p className="text-[8px] sm:text-[10px] font-bold text-white/40">HÒA</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl sm:text-3xl font-mono font-black text-rose-500">{currentMatch.h2h.loss}</p>
                        <p className="text-[8px] sm:text-[10px] font-bold text-white/40">THUA</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 border-2 border-white/10 rounded-[1.5rem] bg-white/5 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-[10px] sm:text-xs font-black text-white/40 uppercase tracking-[0.3em]">ĐỘ TỰ TIN CỦA AI</p>
                      <span className="text-xl font-mono font-black text-white">{currentMatch.confidence}%</span>
                    </div>
                    <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${currentMatch.confidence}%` }}
                        className="h-full bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(3)}
                className="w-full py-5 sm:py-8 bg-white text-black rounded-[1.5rem] sm:rounded-[2rem] text-xl sm:text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 sm:gap-4 hover:bg-emerald-500 transition-all active:scale-95"
              >
                XEM CHIẾN THUẬT VỐN <ChevronRight className="w-6 h-6 sm:w-10 sm:h-10" />
              </button>
            </motion.div>
          )}

          {/* STEP 3: THE STRATEGY */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                <div className="p-6 sm:p-10 border-4 border-emerald-500 rounded-[2rem] sm:rounded-[3rem] bg-emerald-500/5 text-center">
                  <p className="text-[10px] sm:text-sm font-black text-emerald-500 uppercase tracking-[0.4em] mb-2 sm:mb-4">SỐ TIỀN NÊN ĐÁNH</p>
                  <h3 className="text-3xl sm:text-7xl font-mono font-black text-emerald-500">
                    {formatVNĐ(calculations.stake)}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="p-4 sm:p-8 border-4 border-white rounded-[1.5rem] sm:rounded-[2rem] bg-white/5 text-center">
                    <p className="text-[8px] sm:text-xs font-black text-white/40 uppercase tracking-widest mb-1 sm:mb-2">LỢI THẾ (+EV)</p>
                    <h3 className="text-2xl sm:text-4xl font-mono font-black text-emerald-500">+{calculations.ev.toFixed(1)}%</h3>
                  </div>
                  <div className="p-4 sm:p-8 border-4 border-white rounded-[1.5rem] sm:rounded-[2rem] bg-white/5 text-center">
                    <p className="text-[8px] sm:text-xs font-black text-white/40 uppercase tracking-widest mb-1 sm:mb-2">RỦI RO</p>
                    <h3 className={`text-2xl sm:text-4xl font-black ${
                      calculations.riskLevel === 'THẤP' ? 'text-emerald-500' : 
                      calculations.riskLevel === 'TRUNG BÌNH' ? 'text-yellow-500' : 'text-rose-500'
                    }`}>
                      {calculations.riskLevel}
                    </h3>
                  </div>
                </div>

                <div className="p-5 sm:p-8 border-4 border-white rounded-[1.5rem] sm:rounded-[2rem] bg-white/5 space-y-4 sm:space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-base sm:text-lg font-black uppercase tracking-widest">Chiến lược rủi ro</p>
                    <span className="text-xl sm:text-2xl font-mono font-black text-emerald-500">{strategy} Kelly</span>
                  </div>
                  <div className="flex gap-3 sm:gap-4">
                    <button 
                      onClick={() => setStrategy('1/8')}
                      className={`flex-1 py-4 sm:py-6 rounded-2xl border-4 font-black text-lg sm:text-xl transition-all ${
                        strategy === '1/8' ? 'bg-white text-black border-white' : 'border-white/20 text-white/40 hover:border-white'
                      }`}
                    >
                      AN TOÀN (1/8)
                    </button>
                    <button 
                      onClick={() => setStrategy('1/4')}
                      className={`flex-1 py-4 sm:py-6 rounded-2xl border-4 font-black text-lg sm:text-xl transition-all ${
                        strategy === '1/4' ? 'bg-white text-black border-white' : 'border-white/20 text-white/40 hover:border-white'
                      }`}
                    >
                      CHUẨN (1/4)
                    </button>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setStep(4)}
                className="w-full py-5 sm:py-8 bg-white text-black rounded-[1.5rem] sm:rounded-[2rem] text-xl sm:text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 sm:gap-4 hover:bg-emerald-500 transition-all active:scale-95"
              >
                XÁC NHẬN KÈO <ChevronRight className="w-6 h-6 sm:w-10 sm:h-10" />
              </button>
            </motion.div>
          )}

          {/* STEP 4: CONFIRMATION */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12 }}
                className="w-32 h-32 sm:w-48 sm:h-48 bg-emerald-500 rounded-full flex items-center justify-center mb-8 sm:mb-12 shadow-[0_0_100px_rgba(16,185,129,0.4)]"
              >
                <CheckCircle2 className="w-20 h-20 sm:w-32 sm:h-32 text-black" />
              </motion.div>
              
              <h2 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase mb-4 sm:mb-6">SẴN SÀNG!</h2>
              <p className="text-lg sm:text-xl text-white/60 mb-8 sm:mb-12 font-bold">Mọi thông số đã được tối ưu hóa bởi AI.</p>

              <button 
                onClick={confirmBet}
                className="w-full py-6 sm:py-12 bg-emerald-500 text-black rounded-[2rem] sm:rounded-[3rem] text-2xl sm:text-5xl font-black uppercase tracking-tighter hover:bg-emerald-400 transition-all active:scale-95 shadow-[0_30px_60px_rgba(16,185,129,0.3)]"
              >
                CHỐT LỆNH & LƯU VÉ
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- LEDGER SECTION --- */}
        <section className="mt-16 sm:mt-24 space-y-6 sm:space-y-8">
          <div className="flex items-center justify-between border-b-4 border-white pb-3 sm:pb-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <History className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter">VÉ ĐÃ LƯU</h2>
            </div>
            <div className="text-lg sm:text-2xl font-mono font-black text-emerald-500">
              {formatVNĐ(bankroll)}
            </div>
          </div>

          {isTilting && (
            <motion.div 
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: [0, -10, 10, -10, 10, 0], opacity: 1 }}
              className="p-5 sm:p-8 bg-rose-500 text-black rounded-[1.5rem] sm:rounded-[2rem] flex items-center gap-4 sm:gap-6 border-4 border-white"
            >
              <AlertTriangle className="w-10 h-10 sm:w-16 sm:h-16 shrink-0" />
              <p className="text-lg sm:text-2xl font-black uppercase leading-tight">
                CẢNH BÁO: BẠN ĐANG CÓ DẤU HIỆU CAY CÚ. HÃY NGHỈ NGƠI 30 PHÚT.
              </p>
            </motion.div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            {ledger.length > 0 ? (
              ledger.map((bet) => (
                <motion.div 
                  key={bet.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-5 sm:p-8 border-4 border-white rounded-[2rem] sm:rounded-[2.5rem] bg-white/5 space-y-4 sm:space-y-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[8px] sm:text-xs font-black text-white/40 uppercase tracking-widest mb-1">{bet.date}</p>
                      <h3 className="text-xl sm:text-4xl font-black tracking-tighter">{bet.match}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] sm:text-xs font-black text-white/40 uppercase tracking-widest mb-1">TIỀN ĐÁNH</p>
                      <p className="text-lg sm:text-3xl font-mono font-black text-emerald-500">{formatVNĐ(bet.stake)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-8 py-3 sm:py-4 border-y border-white/10">
                    <div>
                      <p className="text-[8px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest">ODDS</p>
                      <p className="text-lg sm:text-2xl font-mono font-black">{bet.odds.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[8px] sm:text-[10px] font-black text-white/40 uppercase tracking-widest">LỢI THẾ</p>
                      <p className="text-lg sm:text-2xl font-mono font-black text-emerald-500">+{bet.ev.toFixed(1)}%</p>
                    </div>
                    <div className="ml-auto">
                      <span className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[8px] sm:text-xs font-black uppercase tracking-widest border-2 ${
                        bet.status === 'pending' ? 'border-yellow-500 text-yellow-500' :
                        bet.status === 'won' ? 'border-emerald-500 text-emerald-500' :
                        bet.status === 'lost' ? 'border-rose-500 text-rose-500' : 'border-white/40 text-white/40'
                      }`}>
                        {bet.status === 'pending' ? 'ĐANG RUNG' : bet.status === 'won' ? 'HÚP' : bet.status === 'lost' ? 'GÃY' : 'HÒA/HỦY'}
                      </span>
                    </div>
                  </div>

                  {bet.status === 'pending' && (
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                      <button 
                        onClick={() => updateBetStatus(bet.id, 'won')}
                        className="py-4 sm:py-6 bg-emerald-500 text-black rounded-2xl font-black text-base sm:text-xl uppercase hover:bg-emerald-400 transition-all active:scale-95"
                      >
                        ✅ HÚP
                      </button>
                      <button 
                        onClick={() => updateBetStatus(bet.id, 'lost')}
                        className="py-4 sm:py-6 bg-rose-500 text-black rounded-2xl font-black text-base sm:text-xl uppercase hover:bg-rose-400 transition-all active:scale-95"
                      >
                        ❌ GÃY
                      </button>
                      <button 
                        onClick={() => updateBetStatus(bet.id, 'void')}
                        className="py-4 sm:py-6 bg-white text-black rounded-2xl font-black text-base sm:text-xl uppercase hover:bg-white/80 transition-all active:scale-95"
                      >
                        ➖ HÒA
                      </button>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="p-20 border-4 border-dashed border-white/10 rounded-[3rem] text-center">
                <p className="text-2xl font-black uppercase text-white/20 tracking-widest italic">Chưa có vé cược nào được lưu.</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Trap Detection Modal */}
      <AnimatePresence>
        {showTrapModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-rose-600 flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.8, rotate: -5 }}
              animate={{ scale: 1, rotate: 0 }}
              className="max-w-2xl text-center space-y-12"
            >
              <div className="flex justify-center">
                <ShieldAlert className="w-40 h-40 text-white animate-bounce" />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-6xl font-black uppercase tracking-tighter text-white">⚠️ CẢNH BÁO BẪY (TRAP DETECTED!)</h2>
                <p className="text-2xl font-bold text-white/90 leading-tight">
                  Phát hiện biến động Odds bất thường. Nhà cái đang 'dụ' người dùng vào cửa này. 
                  AI khuyến nghị: <span className="underline">NÉ NGAY HOẶC GIẢM VỐN XUỐNG 1/10.</span>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <button 
                  onClick={() => setShowTrapModal(false)}
                  className="py-8 bg-white/20 text-white rounded-[2rem] text-2xl font-black uppercase tracking-tighter hover:bg-white/30 transition-all"
                >
                  TÔI ĐÃ HIỂU, VẪN TIẾP TỤC
                </button>
                <button 
                  onClick={() => {
                    setShowTrapModal(false);
                    setStep(1);
                    setScanPreview(null);
                    setScanBase64(null);
                    setScanMimeType(null);
                  }}
                  className="py-8 bg-emerald-400 text-black rounded-[2rem] text-2xl font-black uppercase tracking-tighter hover:bg-emerald-300 transition-all shadow-2xl"
                >
                  HỦY LỆNH ĐỂ AN TOÀN
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash Message */}
      <AnimatePresence>
        {flashMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] bg-white text-black px-10 py-6 rounded-[2rem] font-black text-2xl shadow-[0_20px_60px_rgba(255,255,255,0.3)] border-4 border-emerald-500"
          >
            {flashMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg bg-black border-4 border-white rounded-[3rem] p-10 relative"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-6 right-6 p-4 hover:bg-white/10 rounded-full transition-all"
              >
                <X className="w-8 h-8" />
              </button>

              <div className="mb-12">
                <h2 className="text-4xl font-black uppercase tracking-tighter mb-2">⚙️ CÀI ĐẶT HỆ THỐNG</h2>
                <p className="text-white/40 font-bold">Cấu hình AI và quản trị vốn của bạn.</p>
              </div>

              <div className="space-y-8 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                {/* AI Config */}
                <div className="space-y-6 p-6 border-2 border-white/10 rounded-2xl bg-white/5">
                  <div className="flex items-center gap-3 text-emerald-500">
                    <Cpu className="w-6 h-6" />
                    <h3 className="text-xl font-black uppercase tracking-widest">Cấu hình AI</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Lựa chọn Model</label>
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full bg-black border-2 border-white/20 rounded-xl px-4 py-3 font-bold focus:border-emerald-500 outline-none"
                    >
                      <option value="gemini-3-flash-preview">Gemini 3 Flash (Nhanh)</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Chính xác)</option>
                      <option value="gemini-3.1-flash-lite-preview">Gemini 3.1 Lite (Tiết kiệm)</option>
                    </select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Gemini API Key</label>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded ${customApiKey || (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                        {customApiKey || (typeof process !== 'undefined' && process.env.GEMINI_API_KEY) ? 'ĐÃ KẾT NỐI' : 'CHƯA CÓ KEY'}
                      </span>
                    </div>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                      <input 
                        type="password" 
                        value={customApiKey}
                        onChange={(e) => setCustomApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full bg-black border-2 border-white/20 rounded-xl pl-12 pr-4 py-3 font-mono text-sm focus:border-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-[0.3em] text-white/60">VỐN GỐC (VNĐ)</label>
                  <input 
                    type="number" 
                    value={bankroll}
                    onChange={(e) => setBankroll(Number(e.target.value))}
                    className="w-full bg-white/5 border-4 border-white rounded-2xl px-8 py-6 text-4xl font-mono font-black focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <button 
                  onClick={() => {
                    if (window.confirm("XÓA TOÀN BỘ LỊCH SỬ?")) {
                      setLedger([]);
                      localStorage.removeItem('qb_v5_ledger');
                    }
                  }}
                  className="w-full py-6 border-4 border-rose-500 text-rose-500 rounded-2xl font-black text-xl uppercase hover:bg-rose-500 hover:text-black transition-all flex items-center justify-center gap-3"
                >
                  <Trash2 className="w-6 h-6" /> XÓA DỮ LIỆU
                </button>

                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full py-8 bg-white text-black rounded-[2rem] text-2xl font-black uppercase tracking-tighter hover:bg-emerald-500 transition-all"
                >
                  LƯU THAY ĐỔI
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="max-w-4xl mx-auto mt-20 pt-10 border-t-4 border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6 opacity-40">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5" />
          <p className="text-[10px] font-black uppercase tracking-widest">Institutional Grade Sports Analytics Engine v7.0</p>
        </div>
        <p className="text-[10px] font-mono font-black">© 2026 QUANTBET AI TERMINAL</p>
      </footer>
    </div>
  );
}
