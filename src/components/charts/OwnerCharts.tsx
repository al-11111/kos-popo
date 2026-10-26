import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { formatRupiah, getLast6Months, getCurrentYearMonth } from '../../utils/formatters';
import { calculatePeriodSummary } from '../../utils/domain';
import { useApp } from '../../context/AppContext';

// Tooltip Minimalis Okupansi
interface OccupancyPayload {
  month: string;
  occupancyRate: number;
  activeRooms: number;
  totalRooms: number;
}

const OccupancyTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: OccupancyPayload }> }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-white dark:bg-[#1D211F] border border-[#E6E2D8] dark:border-[#2B302D] p-3 rounded-lg shadow-sm text-xs space-y-1">
        <div className="font-semibold text-[#1F2421] dark:text-[#E8EAE6] border-b border-[#E6E2D8] dark:border-[#2B302D] pb-1">
          {dataPoint.month}
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-[#6B706B] dark:text-[#A0A6A0]">Tingkat Hunian:</span>
          <span className="font-mono font-semibold text-[#2F6B57] dark:text-[#5FAE92]">
            {dataPoint.occupancyRate}%
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-[11px] text-[#6B706B] dark:text-[#A0A6A0]">
          <span>Kamar Terisi:</span>
          <span className="font-mono">
            {dataPoint.activeRooms} / {dataPoint.totalRooms}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

// Tooltip Minimalis Pendapatan
interface RevenuePayload {
  month: string;
  revenue: number;
  arrears: number;
}

const RevenueTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: RevenuePayload }> }) => {
  if (active && payload && payload.length) {
    const dataPoint = payload[0].payload;
    return (
      <div className="bg-white dark:bg-[#1D211F] border border-[#E6E2D8] dark:border-[#2B302D] p-3 rounded-lg shadow-sm text-xs space-y-1.5 min-w-[180px]">
        <div className="font-semibold text-[#1F2421] dark:text-[#E8EAE6] border-b border-[#E6E2D8] dark:border-[#2B302D] pb-1">
          {dataPoint.month}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[#6B706B] dark:text-[#A0A6A0]">Realisasi Masuk:</span>
          <span className="font-mono font-semibold text-[#2F6B57] dark:text-[#5FAE92]">
            {formatRupiah(dataPoint.revenue)}
          </span>
        </div>
        {dataPoint.arrears > 0 ? (
          <div className="flex items-center justify-between text-[#B7791F]">
            <span>Tunggakan:</span>
            <span className="font-mono">{formatRupiah(dataPoint.arrears)}</span>
          </div>
        ) : (
          <div className="text-[11px] text-[#2E7D4F]">Lunas seluruhnya</div>
        )}
      </div>
    );
  }
  return null;
};

interface ChartProps {
  selectedYM?: string;
}

export const OccupancyChart: React.FC<ChartProps> = ({ selectedYM }) => {
  const { darkMode, payments, rooms, tenants, demoDate } = useApp();

  const baseYM = selectedYM || getCurrentYearMonth();
  const monthsConfig = useMemo(() => getLast6Months(baseYM), [baseYM, demoDate]);

  // Poin 10: Hitung sepenuhnya dengan useMemo dari state payments & tenants
  const data = useMemo(() => {
    const totalRoomsCount = rooms.length || 20;
    return monthsConfig.map((m: { ym: string; shortMonth: string; month: string }) => {
      const summary = calculatePeriodSummary(m.ym, payments, tenants, totalRoomsCount);
      return {
        month: m.month,
        shortMonth: m.shortMonth,
        occupancyRate: summary.occupancyRate,
        activeRooms: summary.occupancyCount,
        totalRooms: totalRoomsCount,
      };
    });
  }, [payments, tenants, rooms, monthsConfig]);

  const avgOccupancy = useMemo(() => {
    if (!data.length) return 95;
    const total = data.reduce((sum: number, item: { occupancyRate: number }) => sum + item.occupancyRate, 0);
    return Math.round(total / data.length);
  }, [data]);

  const accentColor = darkMode ? '#5FAE92' : '#2F6B57';
  const gridColor = darkMode ? '#2B302D' : '#E6E2D8';
  const textColor = darkMode ? '#A0A6A0' : '#6B706B';

  return (
    <div className="w-full flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
            Tingkat Okupansi 6 Bulan Terakhir
          </h4>
          <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] mt-0.5">
            Persentase hunian kamar berdasarkan data sewa aktif
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-semibold text-[#2F6B57] dark:text-[#5FAE92] tabular-nums">
            {avgOccupancy}% Rata-rata
          </span>
        </div>
      </div>

      <div className="w-full h-48 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="occupancyMinimalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.18} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="2 2" stroke={gridColor} opacity={0.8} vertical={false} />

            <XAxis
              dataKey="shortMonth"
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />

            <YAxis
              domain={[60, 100]}
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}%`}
              ticks={[60, 75, 90, 100]}
            />

            <Tooltip content={<OccupancyTooltip />} cursor={{ stroke: accentColor, strokeWidth: 1, strokeDasharray: '3 3' }} />

            <Area
              type="monotone"
              dataKey="occupancyRate"
              stroke={accentColor}
              strokeWidth={2}
              fill="url(#occupancyMinimalGradient)"
              activeDot={{ r: 4, fill: accentColor, stroke: darkMode ? '#1D211F' : '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const RevenueChart: React.FC<ChartProps> = ({ selectedYM }) => {
  const { darkMode, payments, tenants, rooms, demoDate } = useApp();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const baseYM = selectedYM || getCurrentYearMonth();
  const monthsConfig = useMemo(() => getLast6Months(baseYM), [baseYM, demoDate]);

  // Poin 10: Hitung sepenuhnya dengan useMemo dari state payments & tenants
  const data = useMemo(() => {
    const totalRoomsCount = rooms.length || 20;
    return monthsConfig.map((m: { ym: string; shortMonth: string; month: string }) => {
      const summary = calculatePeriodSummary(m.ym, payments, tenants, totalRoomsCount);
      return {
        month: m.month,
        shortMonth: m.shortMonth,
        revenue: summary.revenue,
        arrears: summary.arrears,
      };
    });
  }, [payments, tenants, rooms, monthsConfig]);

  const accentColor = darkMode ? '#5FAE92' : '#2F6B57';
  const gridColor = darkMode ? '#2B302D' : '#E6E2D8';
  const textColor = darkMode ? '#A0A6A0' : '#6B706B';

  const selectedPeriodData = data[data.length - 1];

  return (
    <div className="w-full flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-semibold text-[#1F2421] dark:text-[#E8EAE6]">
            Pendapatan Sewa Realisasi (6 Bulan)
          </h4>
          <p className="text-xs text-[#6B706B] dark:text-[#A0A6A0] mt-0.5">
            Arus kas masuk pembayaran sewa kamar
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono font-semibold text-[#2F6B57] dark:text-[#5FAE92] tabular-nums">
            {selectedPeriodData?.shortMonth || 'Bulan Terpilih'}: {formatRupiah(selectedPeriodData?.revenue || 0)}
          </span>
        </div>
      </div>

      <div className="w-full h-48 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: -14, bottom: 0 }}
            onMouseMove={(state: any) => {
              if (state && typeof state.activeTooltipIndex === 'number') {
                setHoveredIdx(state.activeTooltipIndex);
              }
            }}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <CartesianGrid strokeDasharray="2 2" stroke={gridColor} opacity={0.8} vertical={false} />

            <XAxis
              dataKey="shortMonth"
              stroke={textColor}
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: gridColor }}
            />

            <YAxis
              stroke={textColor}
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val / 1000000}jt`}
              domain={[0, 18000000]}
              ticks={[0, 6000000, 12000000, 18000000]}
            />

            <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'transparent' }} />

            <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={28}>
              {data.map((_item: unknown, index: number) => {
                const isLatest = index === data.length - 1;
                const isHovered = hoveredIdx === index;
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      isHovered
                        ? (darkMode ? '#73C2A7' : '#265A49')
                        : isLatest
                        ? accentColor
                        : (darkMode ? '#2B302D' : '#D5D1C6')
                    }
                    className="transition-colors duration-150"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
