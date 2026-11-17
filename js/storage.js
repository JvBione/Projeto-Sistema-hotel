/**
 * storage.js - Persistência Local (Offline-first) e Gerenciamento de Backups
 */

window.HotelPMS = window.HotelPMS || {};

const STORAGE_KEY_RESERVATIONS = 'pousada_sistema_reservations_v1';
const STORAGE_KEY_CONFIG = 'pousada_sistema_config_v1';

function loadReservations() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
        if (!data) return [];
        let list = JSON.parse(data);
        let modified = false;
        let nextNum = 1001;
        list.forEach(r => {
            if (r.numeroNota) {
                const match = String(r.numeroNota).match(/\d+/);
                if (match) {
                    const n = parseInt(match[0], 10);
                    if (n >= nextNum) nextNum = n + 1;
                }
            }
        });
        list.forEach(r => {
            if (!r.numeroNota && r.status !== 'bloqueio') {
                r.numeroNota = `NF-${nextNum++}`;
                modified = true;
            }
        });
        if (modified) {
            saveReservations(list);
        }
        return list;
    } catch (err) {
        console.error('Erro ao carregar reservas do localStorage:', err);
        return [];
    }
}

function saveReservations(reservations) {
    try {
        localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));
        return true;
    } catch (err) {
        console.error('Erro ao salvar reservas:', err);
        return false;
    }
}

function exportBackup() {
    const reservations = loadReservations();
    const backupObj = {
        versao: '1.0',
        tipo: 'backup_sistema_pousada',
        geradoEm: new Date().toISOString(),
        totalReservas: reservations.length,
        reservas: reservations
    };

    const jsonStr = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}h${String(now.getMinutes()).padStart(2,'0')}`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_hotel_oliveiras_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importBackup(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        if (parsed && Array.isArray(parsed.reservas)) {
            saveReservations(parsed.reservas);
            return { success: true, count: parsed.reservas.length };
        } else if (Array.isArray(parsed)) {
            saveReservations(parsed);
            return { success: true, count: parsed.length };
        } else {
            return { success: false, error: 'Formato de backup inválido.' };
        }
    } catch (e) {
        return { success: false, error: 'Arquivo corrompido ou não é um JSON válido.' };
    }
}

// ==========================================================================
// CONFIGURAÇÕES DE PREÇOS PRÉ-DEFINIDOS DE DIÁRIAS (POR PESSOA)
// ==========================================================================
const STORAGE_KEY_PRICING = 'pousada_sistema_pricing_v1';

const DEFAULT_PRICING = {
    demaisQuartos: {
        valorPorPessoa: 110,
        tabela: { 1: 150, 2: 220, 3: 310, 4: 400, 5: 490 }
    },
    suiteMaster: {
        valorPorPessoa: 190,
        tabela: { 1: 250, 2: 380 }
    }
};

function loadPricingSettings() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PRICING);
        if (!raw) {
            savePricingSettings(DEFAULT_PRICING);
            return JSON.parse(JSON.stringify(DEFAULT_PRICING));
        }
        const parsed = JSON.parse(raw);
        return {
            demaisQuartos: {
                valorPorPessoa: Number(parsed?.demaisQuartos?.valorPorPessoa) || DEFAULT_PRICING.demaisQuartos.valorPorPessoa,
                tabela: { ...DEFAULT_PRICING.demaisQuartos.tabela, ...(parsed?.demaisQuartos?.tabela || {}) }
            },
            suiteMaster: {
                valorPorPessoa: Number(parsed?.suiteMaster?.valorPorPessoa) || DEFAULT_PRICING.suiteMaster.valorPorPessoa,
                tabela: { ...DEFAULT_PRICING.suiteMaster.tabela, ...(parsed?.suiteMaster?.tabela || {}) }
            }
        };
    } catch (e) {
        console.error('Erro ao carregar configurações de preços:', e);
        return JSON.parse(JSON.stringify(DEFAULT_PRICING));
    }
}

function savePricingSettings(settings) {
    try {
        localStorage.setItem(STORAGE_KEY_PRICING, JSON.stringify(settings));
        return true;
    } catch (e) {
        console.error('Erro ao salvar configurações de preços:', e);
        return false;
    }
}

function calculateRoomDailyRate(roomId, numAdultos = 2, numCriancas = 0) {
    const pricing = loadPricingSettings();
    const room = window.HotelPMS.getRoomById ? window.HotelPMS.getRoomById(roomId) : null;
    const isMaster = (room && room.tipo === 'suite_master') || String(roomId) === '110' || String(roomId) === '210';
    const config = isMaster ? pricing.suiteMaster : pricing.demaisQuartos;

    const totalGuests = Math.max(1, (Number(numAdultos) || 0) + (Number(numCriancas) || 0));
    if (config.tabela && config.tabela[totalGuests] !== undefined && config.tabela[totalGuests] !== null) {
        return Number(config.tabela[totalGuests]) || (totalGuests * config.valorPorPessoa);
    }
    return totalGuests * config.valorPorPessoa;
}

window.HotelPMS.loadReservations = loadReservations;
window.HotelPMS.saveReservations = saveReservations;
window.HotelPMS.exportBackup = exportBackup;
window.HotelPMS.importBackup = importBackup;
window.HotelPMS.loadPricingSettings = loadPricingSettings;
window.HotelPMS.savePricingSettings = savePricingSettings;
window.HotelPMS.calculateRoomDailyRate = calculateRoomDailyRate;
