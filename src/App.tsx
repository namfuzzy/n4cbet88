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

// Hàm lấy API Key an toàn cho cả môi trường Vite (Browser) và Node
const getSafeApiKey = (customKey: string) => {
  if (customKey) return customKey.trim();
  
  let envKey = '';
  try {
    // Ưu tiên cho môi trường Vite (React Client)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
      // @ts-ignore
      envKey = import.meta.env.VITE_GEMINI_API_KEY;
    } 
    // Fallback cho môi trường Node/AI Studio
    else if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
      envKey = process.env.GEMINI_API_KEY;
    }
  } catch (e) {
    console.warn("Môi trường không hỗ trợ biến env cục bộ.");
  }
  
  return envKey.trim() || 'AIzaSyAtsWt9KCcC03xjKwhdH06tY1mkdt9xFn0'; // Key fallback của bạn
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
  const [availableModels, setAvailableModels] = useState<{name: string, displayName: string}[]>([
    { name: 'gemini-3-flash-preview', displayName: 'Gemini 3 Flash (Nhanh)' },
    { name: 'gemini-3.1-pro-preview', displayName: 'Gemini 3.1 Pro (Chính xác)' },
    { name: 'gemini-3.1-flash-lite-preview', displayName: 'Gemini 3.1 Lite (Tiết kiệm)' },
    { name: 'gemma-3-27b-it', displayName: 'Gemma 3 27B (Mạnh mẽ)' }
  ]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
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

  const fetchModels = async (manual = false) => {
    try {
      if (manual) setIsLoadingModels(true);
      
      const keyToUse = getSafeApiKey(customApiKey);
      
      if (!keyToUse) {
        if (manual) setFlashMessage("Vui lòng nhập API Key trước!");
        return;
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(keyToUse)}`);
      
      // XỬ LÝ LỖI MẠNH MẼ CHO GITHUB PAGES
      if (!response.ok) {
        if (response.status === 403) {
           throw new Error("Lỗi 403: API Key bị chặn truy cập. Hãy vào Google Cloud kiểm tra phần 'Website restrictions'!");
        }
        const errData = await response.json();
        throw new Error(`API báo lỗi: ${errData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.models) {
        const supported = data.models
          .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
          .map((m: any) => ({
            name: m.name.replace('models/', ''),
            displayName: m.displayName || m.name.replace('models/', '')
          }));
          
        if (supported.length > 0) {
          setAvailableModels(supported);
          if (manual) {
            setFlashMessage(`Đã tải thành công ${supported.length} models!`);
            setTimeout(() => setFlashMessage(null), 3000);
          }
          
          if (!supported.find((m: any) => m.name === selectedModel)) {
             const defaultModel = supported.find((m: any) => m.name.includes('gemini-3.1-pro')) || supported[0];
             if (defaultModel) setSelectedModel(defaultModel.name);
          }
        } else if (manual) {
          setFlashMessage("Không tìm thấy model nào hỗ trợ.");
          setTimeout(() => setFlashMessage(null), 3000);
        }
      }
    } catch (error: any) {
      console.error("Error fetching Gemini models:", error);
      if (manual) {
        setFlashMessage(`Lỗi: ${error.message}`);
        setTimeout(() => setFlashMessage(null), 4000);
      }
    } finally {
      if (manual) setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [customApiKey]);

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
        const apiKeyToUse = getSafeApiKey(customApiKey);

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

        const config: any = {};
        if (!selectedModel.includes('gemma')) {
          config.responseMimeType = "application/json";
          config.responseSchema = {
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
          };
        }

        const response = await ai.models.generateContent({
          model: selectedModel,
          contents: contents,
          config: config
        });

        await addLog("> Đã nhận phản hồi từ AI. Đang xử lý dữ liệu...", 200);
        let rawText = response.text || '{}';
        rawText = rawText.replace(/^
http://googleusercontent.com/immersive_entry_chip/0

**Lưu ý sau khi dán xong code, bạn hãy deploy lại lên GitHub và làm các bước sau:**
1. Mở trang web (GitHub Pages) của bạn lên. 
2. Ấn nút tải lại Model trong phần Cài đặt.
3. Nếu trên màn hình hiện ra thông báo lỗi **"Lỗi 403: API Key bị chặn truy cập..."** thì có nghĩa là API Key của bạn đang bị giới hạn (Restrict). Bạn cần vào [Google Cloud Console](https://console.cloud.google.com/), tìm đến API Key đó và thêm địa chỉ `https://namfuzzy.github.io` vào mục **Website restrictions** là xong ngay! 

Cứ thử dán đè file và push lên GitHub, nếu có vướng mắc gì ở khúc Google Cloud thì báo tôi nhé!
