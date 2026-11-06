export const runStatusLabels = { queued: 'Na fila', running: 'Em execução', waiting: 'Aguardando', completed: 'Concluída', failed: 'Falhou', canceled: 'Cancelada', interrupted: 'Interrompida', restarted: 'Reiniciada', pending: 'Pendente', success: 'Concluída', skipped: 'Ignorada' }
export const activeRunStatuses = ['queued', 'running', 'waiting']
export const formatRunDate = value => value ? new Date(value).toLocaleString('pt-BR') : '—'
