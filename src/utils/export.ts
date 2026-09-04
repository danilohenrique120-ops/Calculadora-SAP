import { ProductionOrder, PROCESS_STAGES, CostDriverRule } from '../types';
import { calcStageMetrics, calcOrderTotals } from './calculations';

/**
 * Generates and downloads a clean CSV file with all headers and computed metrics
 */
export function exportOrdersToCSV(
  orders: ProductionOrder[],
  filename = 'ordens_de_producao_biorreatores.csv',
  driverRules?: CostDriverRule[]
) {
  const headers = [
    'Número OP',
    'Biorreator',
    'Data Preparo',
    'Escala',
    'Operador',
    'Produto',
    'Volume (L)',
    'Status Global',
    // Setup
    'Setup Início',
    'Setup Fim',
    'Setup Standard (min)',
    'Setup Real (min)',
    'Setup Variação (min)',
    'Setup Variação (%)',
    'Setup Status',
    // Abastecimento
    'Abast Início',
    'Abast Fim',
    'Abast Standard (min)',
    'Abast Real (min)',
    'Abast Variação (min)',
    'Abast Variação (%)',
    'Abast Status',
    // Preparo
    'Preparo Início',
    'Preparo Fim',
    'Preparo Standard (min)',
    'Preparo Real (min)',
    'Preparo Variação (min)',
    'Preparo Variação (%)',
    'Preparo Status',
    // Inoculação
    'Inocul Início',
    'Inocul Fim',
    'Inocul Standard (min)',
    'Inocul Real (min)',
    'Inocul Variação (min)',
    'Inocul Variação (%)',
    'Inocul Status',
    // Multiplicação
    'Multip Início',
    'Multip Fim',
    'Multip Standard (min)',
    'Multip Real (min)',
    'Multip Variação (min)',
    'Multip Variação (%)',
    'Multip Status',
    // Totals
    'Tempo Total Real (min)',
    'Tempo Total Real (h)',
    'Tempo Total Standard (min)',
    'Tempo Total Standard (h)',
    'Variação Total (min)',
    'Variação Total (%)',
    // SAP 4.0 Rateios (HH / HM / GGF)
    'HH Real (min)',
    'HH Real (h)',
    'HH Standard (min)',
    'HH Desvio (min)',
    'HM Real (min)',
    'HM Real (h)',
    'HM Standard (min)',
    'HM Desvio (min)',
    'GGF Real (min)',
    'GGF Real (h)',
    'GGF Standard (min)',
    'GGF Desvio (min)',
    'Gargalo Identificado',
    'Observações',
  ];

  const rows = orders.map((order) => {
    const totals = calcOrderTotals(order, driverRules);
    const stageCells: (string | number)[] = [];

    PROCESS_STAGES.forEach((stageDef) => {
      const stage = order.stages[stageDef.id];
      const metrics = calcStageMetrics(stage, order.prepDate, stageDef.id, driverRules, {
        scaleName: order.scaleName,
        bioreactorId: order.bioreactorId,
        productName: order.productName,
        allStages: order.stages,
      });
      const startStr = stage?.startDate && stage?.startTime ? `${stage.startDate} ${stage.startTime}` : (stage?.startTime || '');
      const endStr = stage?.endDate && stage?.endTime ? `${stage.endDate} ${stage.endTime}` : (stage?.endTime || '');
      stageCells.push(
        startStr,
        endStr,
        stage?.standardMin || stageDef.defaultStandardMin,
        metrics.isFilled ? metrics.durationMin : '',
        metrics.isFilled ? metrics.varianceMin : '',
        metrics.isFilled ? `${metrics.variancePercent.toFixed(1)}%` : '',
        metrics.isFilled ? metrics.status : 'pendente'
      );
    });

    const cost = totals.costTotals;
    const realHHMin = cost?.hh?.realMin ?? 0;
    const stdHHMin = cost?.hh?.standardMin ?? 0;
    const varHHMin = cost?.hh?.varianceMin ?? 0;

    const realHMMin = cost?.hm?.realMin ?? 0;
    const stdHMMin = cost?.hm?.standardMin ?? 0;
    const varHMMin = cost?.hm?.varianceMin ?? 0;

    const realGGFMin = cost?.ggf?.realMin ?? 0;
    const stdGGFMin = cost?.ggf?.standardMin ?? 0;
    const varGGFMin = cost?.ggf?.varianceMin ?? 0;

    return [
      `"${order.opNumber}"`,
      `"${order.bioreactorId}"`,
      `"${order.prepDate}"`,
      `"${order.scaleName || ''}"`,
      `"${order.operatorName}"`,
      `"${order.productName}"`,
      order.batchVolumeLiters || '',
      `"${order.status}"`,
      ...stageCells.map((c) => (typeof c === 'string' ? `"${c}"` : c)),
      totals.totalRealMin,
      (totals.totalRealMin / 60).toFixed(2),
      totals.totalStandardMin,
      (totals.totalStandardMin / 60).toFixed(2),
      totals.totalVarianceMin,
      `${totals.totalVariancePercent.toFixed(1)}%`,
      // SAP 4.0 Cost Drivers
      realHHMin,
      (realHHMin / 60).toFixed(2),
      stdHHMin,
      varHHMin,
      realHMMin,
      (realHMMin / 60).toFixed(2),
      stdHMMin,
      varHMMin,
      realGGFMin,
      (realGGFMin / 60).toFixed(2),
      stdGGFMin,
      varGGFMin,
      totals.hasBottleneck ? 'SIM' : 'NÃO',
      `"${(order.notes || '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Downloads full JSON representation for backup or sharing
 */
export function exportOrdersToJSON(orders: ProductionOrder[], filename = 'calculadora_sap_backup_ordens.json') {
  const jsonStr = JSON.stringify(orders, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
