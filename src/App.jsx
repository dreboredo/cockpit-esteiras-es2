import React, { useState, useEffect, useRef } from 'react';
import { Clock, Target, TrendingUp, Package, Calendar, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://acyteyrbcqhvhozsjixu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjeXRleXJiY3FodmhvenNqaXh1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTkyMjAxMCwiZXhwIjoyMTAxNDk4MDEwfQ.OSgAlk7BfXBwB5QWtPyx1Hic6rme8OV6rJo1ramo4GM";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HOURS_ORDER = [
  { hour: 6, shift: 'T1' }, { hour: 7, shift: 'T1' }, { hour: 8, shift: 'T1' }, { hour: 9, shift: 'T1' }, { hour: 10, shift: 'T1' }, { hour: 11, shift: 'T1' }, { hour: 12, shift: 'T1' }, { hour: 13, shift: 'T1' },
  { hour: 14, shift: 'T2' }, { hour: 15, shift: 'T2' }, { hour: 16, shift: 'T2' }, { hour: 17, shift: 'T2' }, { hour: 18, shift: 'T2' }, { hour: 19, shift: 'T2' }, { hour: 20, shift: 'T2' }, { hour: 21, shift: 'T2' },
  { hour: 22, shift: 'T3' }, { hour: 23, shift: 'T3' }, { hour: 0, shift: 'T3' }, { hour: 1, shift: 'T3' }, { hour: 2, shift: 'T3' }, { hour: 3, shift: 'T3' }, { hour: 4, shift: 'T3' }, { hour: 5, shift: 'T3' }
];

const SHIFTS = [
  { id: 'T1', name: 'T1 (06H ÀS 13H)', hours: [6, 7, 8, 9, 10, 11, 12, 13], headerBg: 'bg-blue-50', headerText: 'text-blue-700' },
  { id: 'T2', name: 'T2 (14H ÀS 21H)', hours: [14, 15, 16, 17, 18, 19, 20, 21], headerBg: 'bg-amber-50', headerText: 'text-amber-700' },
  { id: 'T3', name: 'T3 (22H ÀS 05H)', hours: [22, 23, 0, 1, 2, 3, 4, 5], headerBg: 'bg-purple-50', headerText: 'text-purple-700' }
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
  
  // Dados dos Cards (Sempre a data operacional de HOJE)
  const [cardProcessed, setCardProcessed] = useState({});
  const [cardTargets, setCardTargets] = useState({});
  
  // Dados da Tabela (Filtrável por data)
  const [tableProcessed, setTableProcessed] = useState({});
  const [tableTargets, setTableTargets] = useState({});
  
  // Data selecionada para o filtro da tabela (Padrão: HOJE operacional)
  const [selectedTableDate, setSelectedTableDate] = useState(() => {
    const today = new Date();
    if (today.getHours() < 6) today.setDate(today.getDate() - 1);
    return getLocalDateString(today);
  });

  const [lastSync, setLastSync] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const dateInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Busca Dados em Tempo Real para os CARDS
  const fetchCardData = async () => {
    try {
      const todayDate = new Date();
      const operationalDate = new Date(todayDate);
      if (todayDate.getHours() < 6) {
        operationalDate.setDate(operationalDate.getDate() - 1);
      }
      const operationalDateStr = getLocalDateString(operationalDate);

      // Produtividade Cards
      const { data: prodData } = await supabase
        .from('hourly_productivity')
        .select('*')
        .eq('date', operationalDateStr);

      if (prodData) {
        const prodMap = {};
        prodData.forEach(item => {
          let itemHour = parseHourValue(item.hour);
          if (!isNaN(itemHour)) prodMap[itemHour] = item.processed_volume;
        });
        setCardProcessed(prodMap);
      }

      // Metas Cards
      const { data: targetData } = await supabase
        .from('hourly_targets')
        .select('*')
        .eq('date', operationalDateStr);

      if (targetData) {
        const targetMap = {};
        targetData.forEach(item => {
          let itemHour = parseHourValue(item.hour);
          if (!isNaN(itemHour)) targetMap[itemHour] = item.target_volume;
        });
        setCardTargets(targetMap);
      }

      // Buscar a última atualização (updated_at) no banco
      const { data: lastUpdateData } = await supabase
        .from('hourly_productivity')
        .select('updated_at')
        .order('updated_at', { ascending: false })
        .limit(1);

      if (lastUpdateData && lastUpdateData.length > 0 && lastUpdateData[0].updated_at) {
        const rawStr = String(lastUpdateData[0].updated_at).trim();

        // Extrai diretamente a hora HH:MM:SS da string bruta para evitar alterações de fuso fuso/UTC
        const timeMatch = rawStr.match(/(\d{2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
          setLastSync(`${timeMatch[1]}:${timeMatch[2]}:${timeMatch[3]}`);
        } else {
          setLastSync(rawStr);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados dos cards:", err);
    }
  };

  // 2. Busca Dados para a TABELA com base na data do filtro
  const fetchTableData = async (dateStr) => {
    setIsLoading(true);
    try {
      // Produtividade Tabela
      const { data: prodData } = await supabase
        .from('hourly_productivity')
        .select('*')
        .eq('date', dateStr);

      const prodMap = {};
      if (prodData) {
        prodData.forEach(item => {
          let itemHour = parseHourValue(item.hour);
          if (!isNaN(itemHour)) prodMap[itemHour] = item.processed_volume;
        });
      }
      setTableProcessed(prodMap);

      // Metas Tabela
      const { data: targetData } = await supabase
        .from('hourly_targets')
        .select('*')
        .eq('date', dateStr);

      const targetMap = {};
      if (targetData) {
        targetData.forEach(item => {
          let itemHour = parseHourValue(item.hour);
          if (!isNaN(itemHour)) targetMap[itemHour] = item.target_volume;
        });
      }
      setTableTargets(targetMap);

    } catch (err) {
      console.error("Erro ao carregar dados da tabela:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Atualização Global
  const handleRefreshAll = async () => {
    await fetchCardData();
    await fetchTableData(selectedTableDate);
  };

  useEffect(() => {
    fetchCardData();
    const interval = setInterval(fetchCardData, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTableData(selectedTableDate);
  }, [selectedTableDate]);

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentSecond = now.getSeconds();

  const minutesLeft = 59 - currentMinute;
  const secondsLeft = 59 - currentSecond;

  // Formatação para exibição no Card de Data
  const [yearSel, monthSel, daySel] = selectedTableDate.split('-');
  const displayDateObj = new Date(parseInt(yearSel), parseInt(monthSel) - 1, parseInt(daySel));
  const weekdayStr = displayDateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const weekdayFormatted = weekdayStr.charAt(0).toUpperCase() + weekdayStr.slice(1);
  const dateFormatted = `${daySel}/${monthSel}/${yearSel}`;
  const fullHeaderDate = `${weekdayFormatted} - ${dateFormatted}`;

  const timeProgressPercent = ((currentMinute * 60 + currentSecond) / 3600) * 100;
  const clockTheme = getClockColor(timeProgressPercent);

  // Valores para os Cards (Horário real atual)
  const metaHora = cardTargets[currentHour] !== undefined ? cardTargets[currentHour] : 6000;
  const processadoHora = cardProcessed[currentHour] || 0;

  const elapsedMinutes = currentMinute === 0 ? 1 : currentMinute;
  const projecaoHora = Math.round((processadoHora / elapsedMinutes) * 60);

  const pacotesPorMinuto = Math.round(processadoHora / elapsedMinutes);
  const faltaParaMeta = Math.max(0, metaHora - processadoHora);

  const metaPercent = metaHora > 0 ? (processadoHora / metaHora) * 100 : 0;
  const processadoTheme = getPerformanceColor(metaPercent);
  const isProjecaoBoa = projecaoHora >= metaHora;

  // Totais do Turno para a Tabela
  const getShiftTotals = (shiftHours) => {
    let totalTarget = 0;
    let totalProcessed = 0;
    let hasData = false;

    shiftHours.forEach(h => {
      if (tableTargets[h] !== undefined) {
        totalTarget += tableTargets[h];
      }
      if (tableProcessed[h] !== undefined) {
        totalProcessed += tableProcessed[h];
        hasData = true;
      }
    });

    const percent = totalTarget > 0 ? (totalProcessed / totalTarget) * 100 : 0;
    return { totalTarget, totalProcessed, percent, hasData };
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-100 text-slate-800 p-3 lg:p-4 flex flex-col justify-between select-none gap-3">
      
      {/* CABEÇALHO COM FILTRO DE DATA INTERATIVO */}
      <header className="flex flex-wrap gap-2 justify-between items-center bg-white px-4 pt-3 pb-3.5 rounded-2xl border border-slate-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 text-white p-2.5 rounded-2xl shadow-md">
            <Package className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-lg lg:text-2xl font-black text-slate-900 tracking-tight uppercase leading-tight">
              Processamento Esteiras - SPX ES2
            </h1>
            <p className="text-slate-500 text-xs font-semibold">
              Monitoramento Operacional de Produtividade em Tempo Real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* CARD DE SELEÇÃO DE DATA COM FILTRO */}
          <div 
            onClick={() => dateInputRef.current && dateInputRef.current.showPicker?.()}
            className="relative bg-slate-50 hover:bg-slate-100 border border-slate-200 px-4 h-11 rounded-2xl flex items-center gap-2 shadow-sm cursor-pointer transition-all"
            title="Clique para alterar a data da tabela"
          >
            <Calendar className="w-4 h-4 text-orange-500 pointer-events-none" />
            <span className="text-xs lg:text-sm font-black text-slate-800 tracking-wide whitespace-nowrap pointer-events-none">
              {fullHeaderDate}
            </span>
            <input 
              ref={dateInputRef}
              type="date"
              value={selectedTableDate}
              onChange={(e) => e.target.value && setSelectedTableDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* BOTÃO ATUALIZAR + ÚLTIMA SYNC (DO BANCO) */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={handleRefreshAll}
              disabled={isLoading}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 transition-all text-white font-black px-4 h-11 rounded-2xl shadow-md flex items-center justify-center gap-2 text-xs lg:text-sm uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              title="Atualizar dados manualmente"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
            <span className="text-[10px] font-bold text-slate-400 absolute top-full left-1/2 -translate-x-1/2 pt-0.5 whitespace-nowrap">
              Última sync: {lastSync || '--:--:--'}
            </span>
          </div>
        </div>
      </header>

      {/* CARDS PRINCIPAIS (INVARIÁVEIS - SOMENTE TEMPO REAL) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 my-auto shrink-0">
        
        {/* RELÓGIO & TIMER */}
        <div 
          className="bg-white border-2 rounded-2xl p-6 lg:p-7 shadow-md flex flex-col justify-between h-56 relative overflow-hidden transition-all duration-500"
          style={{ borderColor: clockTheme.border }}
        >
          <div 
            className="absolute top-0 left-0 bottom-0 transition-all duration-1000 ease-linear pointer-events-none"
            style={{ width: `${timeProgressPercent}%`, backgroundColor: clockTheme.fillBg }}
          />

          <div className="relative z-10 flex justify-between items-center border-b border-slate-200/60 pb-2">
            <span className="text-sm font-black uppercase tracking-wider text-slate-700">Relógio & Timer da Hora</span>
            <Clock className="w-6 h-6" style={{ color: clockTheme.accent }} />
          </div>

          <div className="relative z-10 flex items-center justify-between my-auto">
            <div className="text-5xl lg:text-7xl font-mono font-black text-slate-900 tracking-tight leading-none">
              {now.toLocaleTimeString('pt-BR')}
            </div>
            <div 
              className="px-3.5 py-2 rounded-2xl flex items-center gap-2.5 border shadow-sm backdrop-blur-sm transition-colors"
              style={{ backgroundColor: 'white', borderColor: clockTheme.border }}
            >
              <span className="text-xs font-extrabold text-slate-500 uppercase">Falta:</span>
              <span className="font-mono font-black text-lg lg:text-2xl leading-none" style={{ color: clockTheme.accent }}>
                {String(minutesLeft).padStart(2, '0')}:{String(secondsLeft).padStart(2, '0')}
              </span>
            </div>
          </div>

          <p className="relative z-10 text-xs text-slate-600 font-bold">
            Contagem regressiva para o encerramento da hora atual
          </p>
        </div>

        {/* META HORA */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 lg:p-7 shadow-md flex flex-col justify-between h-56">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="text-sm font-black uppercase tracking-wider text-slate-700">Meta Hora</span>
            <Target className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-5xl lg:text-7xl font-black text-blue-600 my-auto tracking-tight leading-none">
            {metaHora.toLocaleString('pt-BR')} <span className="text-2xl lg:text-3xl font-bold text-slate-400">pacotes</span>
          </div>
          <p className="text-xs text-slate-600 font-bold">Capacidade / Meta planejada para a hora vigente</p>
        </div>

        {/* PROJEÇÃO HORA */}
        <div className={`bg-white border-2 rounded-2xl p-6 lg:p-7 shadow-md flex flex-col justify-between h-56 transition-colors ${
          isProjecaoBoa ? 'border-emerald-400' : 'border-amber-400'
        }`}>
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <span className="text-sm font-black uppercase tracking-wider text-slate-700">Projeção Hora</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                {pacotesPorMinuto.toLocaleString('pt-BR')} pct/min
              </span>
              <TrendingUp className={`w-6 h-6 ${isProjecaoBoa ? 'text-emerald-600' : 'text-amber-500'}`} />
            </div>
          </div>
          <div className={`text-5xl lg:text-7xl font-black my-auto tracking-tight leading-none ${
            isProjecaoBoa ? 'text-emerald-600' : 'text-amber-500'
          }`}>
            {projecaoHora.toLocaleString('pt-BR')} <span className="text-2xl lg:text-3xl font-bold text-slate-400">pacotes</span>
          </div>
          <p className="text-xs text-slate-600 font-bold">Ritmo estimado de entrega baseado nos {currentMinute}min decorridos</p>
        </div>

        {/* PROCESSADO HORA */}
        <div 
          className="rounded-2xl p-6 lg:p-7 shadow-md flex flex-col justify-between h-56 transition-all duration-500 border-2"
          style={{ backgroundColor: processadoTheme.bg, borderColor: processadoTheme.border }}
        >
          <div className="flex justify-between items-center border-b border-slate-200/50 pb-2">
            <span className="text-sm font-black uppercase tracking-wider text-slate-700">Processado Hora</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-white/80 text-slate-700 border border-slate-200/80 shadow-xs">
                {faltaParaMeta > 0 ? `Falta ${faltaParaMeta.toLocaleString('pt-BR')} pct` : 'Meta batida! 🎉'}
              </span>
              <Package className="w-6 h-6" style={{ color: processadoTheme.text }} />
            </div>
          </div>
          
          <div className="flex items-center justify-between my-auto gap-2">
            <div className="text-5xl lg:text-7xl font-black tracking-tight leading-none" style={{ color: processadoTheme.text }}>
              {processadoHora.toLocaleString('pt-BR')} <span className="text-2xl lg:text-3xl font-bold text-slate-400">pacotes</span>
            </div>
            
            <div 
              className="px-3 py-1.5 rounded-full font-black text-sm lg:text-base shadow-sm border whitespace-nowrap"
              style={{ 
                backgroundColor: processadoTheme.tagBg, 
                color: processadoTheme.text,
                borderColor: processadoTheme.border
              }}
            >
              {metaPercent.toFixed(2)}% da Meta
            </div>
          </div>
          
          <p className="text-xs text-slate-600 font-bold">Volume total bipado e processado na hora atual</p>
        </div>

      </div>

      {/* TABELA DE ACOMPANHAMENTO (RESPONDE AO FILTRO DE DATA) */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-3 lg:p-4 shadow-md overflow-x-auto shrink-0">
        <h2 className="text-xs lg:text-sm font-black text-slate-800 mb-2 uppercase tracking-wider flex items-center justify-between">
          <span>Acompanhamento por Turno & Hora</span>
          <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
            Exibindo dados de: {dateFormatted}
          </span>
        </h2>

        <div className="w-full min-w-[1200px]">
          <table className="w-full text-center border-collapse">
            <thead>
              {/* CABEÇALHO DO TURNO */}
              <tr className="border-b border-slate-200 uppercase">
                <th className="py-1 px-2 text-left text-slate-700 bg-slate-50 font-black text-[11px] w-32 min-w-[120px]">TURNO</th>
                {SHIFTS.map(shift => (
                  <th key={shift.id} colSpan="8" className={`py-1 px-2 border-x border-slate-200 font-black text-xs lg:text-sm tracking-wide ${shift.headerBg} ${shift.headerText}`}>
                    {shift.name}
                  </th>
                ))}
              </tr>

              <tr className="border-b border-slate-200 text-[11px] font-black uppercase">
                <th className="py-1 px-2 text-left text-slate-700 bg-slate-50 font-black">HORA</th>
                {HOURS_ORDER.map(({ hour }) => {
                  const isCurrent = hour === currentHour;
                  return (
                    <th 
                      key={hour} 
                      className={`py-1 px-1 border-r border-slate-100 ${
                        isCurrent ? 'bg-orange-500 text-white font-black text-xs shadow-sm' : 'text-slate-600 font-bold'
                      }`}
                    >
                      {hour}h
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {/* METAS */}
              <tr className="border-b border-slate-200 text-[11px] font-black">
                <td className="py-1 px-2 text-left font-black text-slate-700 bg-slate-50 whitespace-nowrap">META</td>
                {HOURS_ORDER.map(({ hour }) => {
                  const target = tableTargets[hour];
                  const isCurrent = hour === currentHour;
                  return (
                    <td 
                      key={hour} 
                      className={`py-1 px-1 border-r border-slate-100 text-[11px] font-black text-slate-700 ${
                        isCurrent ? 'bg-orange-50 text-orange-600 font-black' : ''
                      }`}
                    >
                      {target !== undefined ? target.toLocaleString('pt-BR') : '-'}
                    </td>
                  );
                })}
              </tr>

              {/* PROCESSADO */}
              <tr className="border-b border-slate-200 text-[11px] font-black">
                <td className="py-1 px-2 text-left font-black text-slate-700 bg-slate-50 whitespace-nowrap">PROCESSADO</td>
                {HOURS_ORDER.map(({ hour }) => {
                  const val = tableProcessed[hour];
                  const target = tableTargets[hour] !== undefined ? tableTargets[hour] : 6000;
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
                      className={`py-1 px-1 border-r border-slate-100 text-[11px] transition-all ${
                        isCurrent 
                          ? 'font-black text-xs' 
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
              <tr className="border-b-2 border-slate-300 text-[11px] font-black">
                <td className="py-1 px-2 text-left font-black text-slate-700 bg-slate-50 whitespace-nowrap">% REALIZADA</td>
                {HOURS_ORDER.map(({ hour }) => {
                  const val = tableProcessed[hour];
                  const target = tableTargets[hour] !== undefined ? tableTargets[hour] : 6000;
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
                      className={`py-1 px-1 border-r border-slate-100 text-[11px] transition-all ${
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

              {/* RESUMO TOTAL DO TURNO */}
              <tr className="bg-slate-50 text-[11px] font-black border-t-2 border-slate-300">
                <td className="py-1.5 px-2 text-left font-black text-slate-900 bg-slate-200 uppercase tracking-wider">
                  TOTAL TURNO
                </td>
                {SHIFTS.map(shift => {
                  const { totalTarget, totalProcessed, percent, hasData } = getShiftTotals(shift.hours);
                  const isHit = percent >= 100;

                  return (
                    <td colSpan="8" key={shift.id} className="py-1 px-2 border-x border-slate-300 bg-slate-100/80">
                      <div className="flex items-center justify-around gap-1 px-1">
                        
                        {/* Meta Turno */}
                        <div className="flex flex-col items-center gap-0">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Meta Turno</span>
                          <span className="text-slate-800 font-black text-xs">{totalTarget.toLocaleString('pt-BR')}</span>
                        </div>
                        
                        <div className="h-4 w-px bg-slate-300" />
                        
                        {/* Processado */}
                        <div className="flex flex-col items-center gap-0">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Processado</span>
                          <span className={`font-black text-xs ${
                            hasData && totalProcessed > 0
                              ? isHit 
                                ? 'text-emerald-600' 
                                : 'text-red-600'
                              : 'text-slate-800'
                          }`}>
                            {totalProcessed.toLocaleString('pt-BR')}
                          </span>
                        </div>
                        
                        <div className="h-4 w-px bg-slate-300" />
                        
                        {/* % Realizada */}
                        <div className="flex flex-col items-center gap-0">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">% Realizada</span>
                          <span className={`text-[11px] font-black px-1.5 py-0.5 rounded border ${
                            hasData 
                              ? isHit 
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                                : 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-slate-200 text-slate-500 border-slate-300'
                          }`}>
                            {hasData ? `${percent.toFixed(2)}%` : '-'}
                          </span>
                        </div>

                      </div>
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
