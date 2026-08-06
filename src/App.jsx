import React, { useState, useEffect } from 'react';
import { Clock, Target, TrendingUp, Package, Calendar, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://acyteyrbcqhvhozsjixu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjeXRleXJiY3FodmhvenNqaXh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkyMjAxMCwiZXhwIjoyMTAxNDk4MDEwfQ.OSgAlk7BfXBwB5QWtPyx1Hic6rme8OV6rJo1ramo4GM";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HOURS_ORDER = [
  { hour: 6 }, { hour: 7 }, { hour: 8 }, { hour: 9 }, { hour: 10 }, { hour: 11 }, { hour: 12 }, { hour: 13 },
  { hour: 14 }, { hour: 15 }, { hour: 16 }, { hour: 17 }, { hour: 18 }, { hour: 19 }, { hour: 20 }, { hour: 21 },
  { hour: 22 }, { hour: 23 }, { hour: 0 }, { hour: 1 }, { hour: 2 }, { hour: 3 }, { hour: 4 }, { hour: 5 }
];

function getLocalDateString(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseHourValue(rawHour) {
  let h = NaN;
  if (typeof rawHour === 'number') {
    h = rawHour;
  } else if (typeof rawHour === 'string') {
    const clean = rawHour.split(':')[0];
    h = parseInt(clean, 10);
  }
  return h;
}

function getPerformanceColor(percent) {
  if (percent >= 100) {
    return {
      text: 'hsl(142, 85%, 35%)',
      bg: 'hsl(142, 85%, 96%)',
      border: 'hsl(142, 75%, 50%)',
      tagBg: 'hsl(142, 85%, 90%)'
    };
  }
  const p = Math.min(Math.max(percent, 0), 99.99);
  const hue = (p / 100) * 45;
  return {
    text: `hsl(${hue}, 85%, 38%)`,
    bg: `hsl(${hue}, 85%, 96%)`,
    border: `hsl(${hue}, 75%, 50%)`,
    tagBg: `hsl(${hue}, 85%, 90%)`
  };
}

function getClockColor(percent) {
  const p = Math.min(Math.max(percent, 0), 100);
  const hue = 142 - (p / 100) * 142;
  return {
    fillBg: `hsl(${hue}, 85%, 93%)`,
    accent: `hsl(${hue}, 85%, 38%)`,
    border: `hsl(${hue}, 75%, 60%)`
  };
}

export default function App() {
  const [now, setNow] = useState(new Date());
  const [realProcessed, setRealProcessed] = useState({});
  const [realTargets, setRealTargets] = useState({});
  const [lastSync, setLastSync] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const todayDate = new Date();
      
      // Calcula a data operacional (Ciclo das 06h00 até às 05h59 do dia seguinte)
      const operationalDate = new Date(todayDate);
      if (todayDate.getHours() < 6) {
        operationalDate.setDate(operationalDate.getDate() - 1);
      }
      const operationalDateStr = getLocalDateString(operationalDate);

      // 1. Produtividade (Filtra estritamente pela Data Operacional)
      const { data: prodData, error: prodErr } = await supabase
        .from('hourly_productivity')
        .select('*')
        .eq('date', operationalDateStr);

      if (!prodErr && prodData) {
        const prodMap = {};
        prodData.forEach(item => {
          let itemHour = parseHourValue(item.hour);
          if (!isNaN(itemHour)) {
            prodMap[itemHour] = item.processed_volume;
          }
        });
        setRealProcessed(prodMap);
      }

      // 2. Metas (Filtra estritamente pela Data Operacional)
      const { data: targetData, error: targetErr } = await supabase
        .from('hourly_targets')
        .select('*')
        .eq('date', operationalDateStr);

      if (!targetErr && targetData) {
        const targetMap = {};
        targetData.forEach(item => {
          let itemHour = parseHourValue(item.hour);
          if (!isNaN(itemHour)) {
            targetMap[itemHour] = item.target_volume;
          }
        });
        setRealTargets(targetMap);
      }

      setLastSync(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.error("Erro ao buscar dados no Supabase:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 60000);
    return () => clearInterval(interval);
  }, []);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();

  const minutesLeft = 59 - currentMinute;
  const secondsLeft = 59 - currentSecond;

  const weekdayStr = now.toLocaleDateString('pt-BR', { weekday: 'long' });
  const weekdayFormatted = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
  const dateFormatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fullHeaderDate = `${weekdayFormatted} - ${dateFormatted}`;

  const timeProgressPercent = ((currentMinute * 60 + currentSecond) / 3600) * 100;
  const clockTheme = getClockColor(timeProgressPercent);

  const metaHora = realTargets[currentHour] !== undefined ? realTargets[currentHour] : 6000;
  const processadoHora = realProcessed[currentHour] || 0;

  const elapsedMinutes = currentMinute === 0 ? 1 : currentMinute;
  const projecaoHora = Math.round((processadoHora / elapsedMinutes) * 60);

  const pacotesPorMinuto = Math.round(processadoHora / elapsedMinutes);
  const faltaParaMeta = Math.max(0, metaHora - processadoHora);

  const metaPercent = metaHora > 0 ? (processadoHora / metaHora) * 100 : 0;
  const processadoTheme = getPerformanceColor(metaPercent);
  const isProjecaoBoa = projecaoHora >= metaHora;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 p-4 lg:p-6 flex flex-col justify-between select-none gap-6">
      
      {/* CABEÇALHO */}
      <header className="flex flex-wrap gap-4 justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-500 text-white p-3 rounded-2xl shadow-md">
            <Package className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl lg:text-3xl font-black text-slate-900 tracking-tight uppercase">
              Processamento Esteiras - SPX ES2
            </h1>
            <p className="text-slate-500 text-xs lg:text-sm font-semibold">
              Monitoramento Operacional de Produtividade em Tempo Real
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 ml-auto">
          <div className="bg-slate-50 border border-slate-200 px-5 h-12 rounded-2xl flex items-center gap-3 shadow-sm">
            <Calendar className="w-5 h-5 text-orange-500" />
            <span className="text-sm lg:text-base font-black text-slate-800 tracking-wide whitespace-nowrap">
              {fullHeaderDate}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white font-black px-4 h-12 rounded-2xl shadow-md flex items-center gap-2 text-sm uppercase tracking-wider disabled:opacity-50"
              title="Atualizar dados manualmente"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            <span className="text-[11px] font-bold text-slate-400 mt-1">
              Última sincronização: {lastSync || '--:--:--'}
            </span>
          </div>
        </div>
      </header>

      {/* CARDS NO LAYOUT GRID 2X2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-auto">
        
        {/* 1. RELÓGIO & TIMER */}
        <div 
          className="bg-white border-2 rounded-2xl p-7 lg:p-8 shadow-md flex flex-col justify-between h-56 relative overflow-hidden transition-all duration-500"
          style={{ borderColor: clockTheme.border }}
        >
          <div 
            className="absolute top-0 left-0 bottom-0 transition-all duration-1000 ease-linear pointer-events-none"
            style={{ width: `${timeProgressPercent}%`, backgroundColor: clockTheme.fillBg }}
          />

          <div className="relative z-10 flex justify-between items-center border-b border-slate-200/60 pb-3">
            <span className="text-base font-black uppercase tracking-wider text-slate-700">Relógio & Timer da Hora</span>
            <Clock className="w-7 h-7" style={{ color: clockTheme.accent }} />
          </div>

          <div className="relative z-10 flex items-center justify-between my-auto">
            <div className="text-5xl lg:text-7xl font-mono font-black text-slate-900 tracking-tight leading-none">
              {now.toLocaleTimeString('pt-BR')}
            </div>
            <div 
              className="px-4 py-2.5 rounded-2xl flex items-center gap-3 border shadow-sm backdrop-blur-sm transition-colors"
              style={{ backgroundColor: 'white', borderColor: clockTheme.border }}
            >
              <span className="text-xs lg:text-sm font-extrabold text-slate-500 uppercase">Falta:</span>
              <span className="font-mono font-black text-xl lg:text-2xl leading-none" style={{ color: clockTheme.accent }}>
                {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
              </span>
            </div>
          </div>

          <p className="relative z-10 text-sm text-slate-600 font-bold">
            Contagem regressiva para o encerramento da hora atual
          </p>
        </div>

        {/* 2. META HORA */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-7 lg:p-8 shadow-md flex flex-col justify-between h-56">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-base font-black uppercase tracking-wider text-slate-700">Meta Hora</span>
            <Target className="w-7 h-7 text-blue-600" />
          </div>
          <div className="text-5xl lg:text-7xl font-black text-blue-600 my-auto tracking-tight leading-none">
            {metaHora.toLocaleString('pt-BR')} <span className="text-2xl lg:text-3xl font-bold text-slate-400">pacotes</span>
          </div>
          <p className="text-sm text-slate-600 font-bold">Capacidade / Meta planejada para a hora vigente</p>
        </div>

        {/* 3. PROJEÇÃO HORA */}
        <div className={`bg-white border-2 rounded-2xl p-7 lg:p-8 shadow-md flex flex-col justify-between h-56 transition-colors ${
          isProjecaoBoa ? 'border-emerald-400' : 'border-amber-400'
        }`}>
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-base font-black uppercase tracking-wider text-slate-700">Projeção Hora</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                {pacotesPorMinuto.toLocaleString('pt-BR')} pct/min
              </span>
              <TrendingUp className={`w-7 h-7 ${isProjecaoBoa ? 'text-emerald-600' : 'text-amber-500'}`} />
            </div>
          </div>
          <div className={`text-5xl lg:text-7xl font-black my-auto tracking-tight leading-none ${
            isProjecaoBoa ? 'text-emerald-600' : 'text-amber-500'
          }`}>
            {projecaoHora.toLocaleString('pt-BR')} <span className="text-2xl lg:text-3xl font-bold text-slate-400">pacotes</span>
          </div>
          <p className="text-sm text-slate-600 font-bold">Ritmo estimado de entrega baseado nos {currentMinute}min decorridos</p>
        </div>

        {/* 4. PROCESSADO HORA */}
        <div 
          className="rounded-2xl p-7 lg:p-8 shadow-md flex flex-col justify-between h-56 transition-all duration-500 border-2"
          style={{ backgroundColor: processadoTheme.bg, borderColor: processadoTheme.border }}
        >
          <div className="flex justify-between items-center border-b border-slate-200/50 pb-3">
            <span className="text-base font-black uppercase tracking-wider text-slate-700">Processado Hora</span>
            <div className="flex items-center gap-3">
              <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white/80 text-slate-700 border border-slate-200/80 shadow-xs">
                {faltaParaMeta > 0 ? `Falta ${faltaParaMeta.toLocaleString('pt-BR')} pct` : 'Meta batida! 🎉'}
              </span>
              <Package className="w-7 h-7" style={{ color: processadoTheme.text }} />
            </div>
          </div>
          
          <div className="flex items-center justify-between my-auto gap-2">
            <div className="text-5xl lg:text-7xl font-black tracking-tight leading-none" style={{ color: processadoTheme.text }}>
              {processadoHora.toLocaleString('pt-BR')} <span className="text-2xl lg:text-3xl font-bold text-slate-400">pacotes</span>
            </div>
            
            <div 
              className="px-4 py-2 rounded-full font-black text-base lg:text-lg shadow-sm border whitespace-nowrap"
              style={{ 
                backgroundColor: processadoTheme.tagBg, 
                color: processadoTheme.text,
                borderColor: processadoTheme.border
              }}
            >
              {metaPercent.toFixed(2)}% da Meta
            </div>
          </div>
          
          <p className="text-sm text-slate-600 font-bold">Volume total bipado e processado na hora atual</p>
        </div>

      </div>

      {/* TABELA DE ACOMPANHAMENTO */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 lg:p-6 shadow-md overflow-x-auto">
        <h2 className="text-sm lg:text-base font-black text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
          <span>Acompanhamento por Turno & Hora</span>
        </h2>

        <div className="w-full min-w-[1200px]">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-black uppercase">
                <th className="p-2.5 text-left text-slate-700 bg-slate-50 font-black w-36 min-w-[140px]">TURNO</th>
                <th colSpan="8" className="p-2 bg-blue-50 text-blue-700 border-x border-slate-200 font-bold">T1 (06H ÀS 13H)</th>
                <th colSpan="8" className="p-2 bg-amber-50 text-amber-700 border-x border-slate-200 font-bold">T2 (14H ÀS 21H)</th>
                <th colSpan="8" className="p-2 bg-purple-50 text-purple-700 border-l border-slate-200 font-bold">T3 (22H ÀS 05H)</th>
              </tr>

              <tr className="border-b border-slate-200 text-xs font-black uppercase">
                <th className="p-2.5 text-left text-slate-700 bg-slate-50 font-black">HORA</th>
                {HOURS_ORDER.map(({ hour }) => {
                  const isCurrent = hour === currentHour;
                  return (
                    <th 
                      key={hour} 
                      className={`p-2 border-r border-slate-100 ${
                        isCurrent ? 'bg-orange-500 text-white font-black text-sm shadow-sm' : 'text-slate-600 font-bold'
                      }`}
                    >
                      {hour}h
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* METAS REGISTRADAS */}
              <tr className="border-b border-slate-200 text-xs font-black">
                <td className="p-2.5 text-left font-black text-slate-700 bg-slate-50 whitespace-nowrap">META</td>
                {HOURS_ORDER.map(({ hour }) => {
                  const target = realTargets[hour];
                  const isCurrent = hour === currentHour;
                  return (
                    <td 
                      key={hour} 
                      className={`p-2 border-r border-slate-100 text-xs font-black text-slate-700 ${
                        isCurrent ? 'bg-orange-50 text-orange-600 font-black' : ''
                      }`}
                    >
                      {target !== undefined ? target.toLocaleString('pt-BR') : '-'}
                    </td>
                  );
                })}
              </tr>

              {/* PROCESSADO REAL */}
              <tr className="border-b border-slate-200 text-xs font-black">
                <td className="p-2.5 text-left font-black text-slate-700 bg-slate-50 whitespace-nowrap">PROCESSADO</td>
                {HOURS_ORDER.map(({ hour }) => {
                  const val = realProcessed[hour];
                  const target = realTargets[hour] !== undefined ? realTargets[hour] : 6000;
                  const isCurrent = hour === currentHour;
                  const hasProcessed = val !== undefined;
                  const hitTarget = hasProcessed && val >= target;

                  let currentCellStyles = {};
                  if (isCurrent && target) {
                    const currentPercent = (val / target) * 100;
                    const cellTheme = getPerformanceColor(currentPercent);
                    currentCellStyles = {
                      backgroundColor: cellTheme.bg,
                      color: cellTheme.text,
                      boxShadow: `inset 0 0 0 2px ${cellTheme.border}`
                    };
                  }

                  return (
                    <td 
                      key={hour} 
                      style={isCurrent ? currentCellStyles : {}}
                      className={`p-2 border-r border-slate-100 text-xs transition-all ${
                        isCurrent 
                          ? 'font-black text-sm' 
                          : hitTarget 
                          ? 'text-emerald-600 font-black' 
                          : hasProcessed && val > 0
                          ? 'text-red-600 font-black' 
                          : 'text-slate-400 font-normal'
                      }`}
                    >
                      {val !== undefined ? val.toLocaleString('pt-BR') : '-'}
                    </td>
                  );
                })}
              </tr>

              {/* % REALIZADA */}
              <tr className="text-xs font-black">
                <td className="p-2.5 text-left font-black text-slate-700 bg-slate-50 whitespace-nowrap">% REALIZADA</td>
                {HOURS_ORDER.map(({ hour }) => {
                  const val = realProcessed[hour];
                  const target = realTargets[hour] !== undefined ? realTargets[hour] : 6000;
                  const isCurrent = hour === currentHour;
                  const hasValue = val !== undefined;

                  let pctStr = '-';
                  let hitTarget = false;
                  let percent = 0;

                  if (hasValue) {
                    percent = target > 0 ? (val / target) * 100 : 0;
                    pctStr = `${percent.toFixed(2)}%`;
                    hitTarget = percent >= 100;
                  }

                  return (
                    <td 
                      key={hour} 
                      className={`p-2 border-r border-slate-100 text-xs transition-all ${
                        isCurrent 
                          ? 'bg-orange-50 text-orange-600 font-black' 
                          : hitTarget 
                          ? 'text-emerald-600 font-black' 
                          : hasValue && val > 0
                          ? 'text-red-600 font-black' 
                          : 'text-slate-400 font-normal'
                      }`}
                    >
                      {pctStr}
                    </td>
                  );
                })}
              </tr>

            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
