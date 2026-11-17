/**
 * rooms.js - Catálogo oficial dos 32 quartos da Pousada
 * 
 * Estrutura:
 * - Bloco 1 (Térreo): 101 a 110 (Ímpares com janela, pares sem janela, 110 Suíte Master)
 * - Bloco 2 (1º Andar): 201 a 210 (Ímpares com janela, pares sem janela, 210 Suíte Master)
 * - Bloco 3: 111 a 118 (8 quartos)
 * - Bloco 4: 211 a 214 (4 quartos)
 */

window.HotelPMS = window.HotelPMS || {};

const ROOM_CATEGORIES = {
    COM_JANELA: {
        id: 'com_janela',
        nome: 'Com Janela',
        badgeClass: 'badge-window',
        defaultPrice: 220,
        capacidade: 2
    },
    SEM_JANELA: {
        id: 'sem_janela',
        nome: 'Sem Janela',
        badgeClass: 'badge-no-window',
        defaultPrice: 180,
        capacidade: 2
    },
    SUITE_MASTER: {
        id: 'suite_master',
        nome: 'Suíte Master',
        badgeClass: 'badge-master',
        defaultPrice: 380,
        capacidade: 2
    },
    STANDARD: {
        id: 'standard',
        nome: 'Standard',
        badgeClass: 'badge-standard',
        defaultPrice: 200,
        capacidade: 2
    }
};

const BLOCKS = [
    { id: 'bloco-1', nome: 'Bloco 1 - Térreo', andar: 'Térreo' },
    { id: 'bloco-2', nome: 'Bloco 2 - 1º Andar', andar: '1º Andar' },
    { id: 'bloco-3', nome: 'Bloco 3', andar: 'Térreo / Anexo' },
    { id: 'bloco-4', nome: 'Bloco 4', andar: 'Superior / Anexo' }
];

const ROOMS = [
    // -------------------------------------------------------------
    // BLOCO 1 - Térreo (101 a 110)
    // -------------------------------------------------------------
    {
        id: '101',
        numero: '101',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: 'Térreo • Com Janela externa ampla',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 220
    },
    {
        id: '102',
        numero: '102',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.SEM_JANELA,
        tipo: 'sem_janela',
        detalhes: 'Térreo • Sem Janela (Ar condicionado)',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 180
    },
    {
        id: '103',
        numero: '103',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: 'Térreo • Com Janela externa ampla',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 220
    },
    {
        id: '104',
        numero: '104',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.SEM_JANELA,
        tipo: 'sem_janela',
        detalhes: 'Térreo • Sem Janela (Ar condicionado)',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 180
    },
    {
        id: '105',
        numero: '105',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: 'Térreo • Com Janela externa ampla',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 220
    },
    {
        id: '106',
        numero: '106',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.SEM_JANELA,
        tipo: 'sem_janela',
        detalhes: 'Térreo • Sem Janela (Ar condicionado)',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 180
    },
    {
        id: '107',
        numero: '107',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: 'Térreo • Com Janela externa ampla',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 220
    },
    {
        id: '108',
        numero: '108',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.SEM_JANELA,
        tipo: 'sem_janela',
        detalhes: 'Térreo • Sem Janela (Ar condicionado)',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 180
    },
    {
        id: '109',
        numero: '109',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: 'Térreo • Com Janela externa ampla',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 220
    },
    {
        id: '110',
        numero: '110',
        blocoId: 'bloco-1',
        blocoNome: 'Bloco 1 (Térreo)',
        categoria: ROOM_CATEGORIES.SUITE_MASTER,
        tipo: 'suite_master',
        detalhes: 'Térreo • Suíte Master c/ Banheira de Hidro & Frigobar',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 380
    },

    // -------------------------------------------------------------
    // BLOCO 2 - 1º Andar (201 a 210)
    // -------------------------------------------------------------
    {
        id: '201',
        numero: '201',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: '1º Andar • Com Janela vista jardim',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 230
    },
    {
        id: '202',
        numero: '202',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.SEM_JANELA,
        tipo: 'sem_janela',
        detalhes: '1º Andar • Sem Janela (Ar condicionado)',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 190
    },
    {
        id: '203',
        numero: '203',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: '1º Andar • Com Janela vista jardim',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 230
    },
    {
        id: '204',
        numero: '204',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.SEM_JANELA,
        tipo: 'sem_janela',
        detalhes: '1º Andar • Sem Janela (Ar condicionado)',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 190
    },
    {
        id: '205',
        numero: '205',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: '1º Andar • Com Janela vista jardim',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 230
    },
    {
        id: '206',
        numero: '206',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.SEM_JANELA,
        tipo: 'sem_janela',
        detalhes: '1º Andar • Sem Janela (Ar condicionado)',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 190
    },
    {
        id: '207',
        numero: '207',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: '1º Andar • Com Janela vista jardim',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 230
    },
    {
        id: '208',
        numero: '208',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.SEM_JANELA,
        tipo: 'sem_janela',
        detalhes: '1º Andar • Sem Janela (Ar condicionado)',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 190
    },
    {
        id: '209',
        numero: '209',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.COM_JANELA,
        tipo: 'com_janela',
        detalhes: '1º Andar • Com Janela vista jardim',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 230
    },
    {
        id: '210',
        numero: '210',
        blocoId: 'bloco-2',
        blocoNome: 'Bloco 2 (1º Andar)',
        categoria: ROOM_CATEGORIES.SUITE_MASTER,
        tipo: 'suite_master',
        detalhes: '1º Andar • Suíte Master Executiva c/ Varanda & Hidro',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 420
    },

    // -------------------------------------------------------------
    // BLOCO 3 (111 a 118)
    // -------------------------------------------------------------
    {
        id: '111',
        numero: '111',
        blocoId: 'bloco-3',
        blocoNome: 'Bloco 3',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 3 • Apartamento Standard c/ Janela',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 210
    },
    {
        id: '112',
        numero: '112',
        blocoId: 'bloco-3',
        blocoNome: 'Bloco 3',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 3 • Apartamento Standard c/ Janela',
        camas: '2 Camas Solteiro',
        capacidade: 2,
        precoPadrao: 210
    },
    {
        id: '113',
        numero: '113',
        blocoId: 'bloco-3',
        blocoNome: 'Bloco 3',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 3 • Apartamento Standard c/ Janela',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 210
    },
    {
        id: '114',
        numero: '114',
        blocoId: 'bloco-3',
        blocoNome: 'Bloco 3',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 3 • Apartamento Standard c/ Janela',
        camas: '1 Cama Casal + 1 Solteiro',
        capacidade: 3,
        precoPadrao: 240
    },
    {
        id: '115',
        numero: '115',
        blocoId: 'bloco-3',
        blocoNome: 'Bloco 3',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 3 • Apartamento Standard c/ Janela',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 210
    },
    {
        id: '116',
        numero: '116',
        blocoId: 'bloco-3',
        blocoNome: 'Bloco 3',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 3 • Apartamento Standard c/ Janela',
        camas: '2 Camas Solteiro',
        capacidade: 2,
        precoPadrao: 210
    },
    {
        id: '117',
        numero: '117',
        blocoId: 'bloco-3',
        blocoNome: 'Bloco 3',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 3 • Apartamento Standard c/ Janela',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 210
    },
    {
        id: '118',
        numero: '118',
        blocoId: 'bloco-3',
        blocoNome: 'Bloco 3',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 3 • Apartamento Standard c/ Janela',
        camas: '1 Cama Casal + 1 Solteiro',
        capacidade: 3,
        precoPadrao: 240
    },

    // -------------------------------------------------------------
    // BLOCO 4 (211 a 214)
    // -------------------------------------------------------------
    {
        id: '211',
        numero: '211',
        blocoId: 'bloco-4',
        blocoNome: 'Bloco 4',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 4 • Suíte Superior c/ Janela',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 220
    },
    {
        id: '212',
        numero: '212',
        blocoId: 'bloco-4',
        blocoNome: 'Bloco 4',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 4 • Suíte Superior c/ Janela',
        camas: '1 Cama Casal + 1 Solteiro',
        capacidade: 3,
        precoPadrao: 250
    },
    {
        id: '213',
        numero: '213',
        blocoId: 'bloco-4',
        blocoNome: 'Bloco 4',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 4 • Suíte Superior c/ Janela',
        camas: '1 Cama Casal',
        capacidade: 2,
        precoPadrao: 220
    },
    {
        id: '214',
        numero: '214',
        blocoId: 'bloco-4',
        blocoNome: 'Bloco 4',
        categoria: ROOM_CATEGORIES.STANDARD,
        tipo: 'standard',
        detalhes: 'Bloco 4 • Suíte Familiar c/ Varanda',
        camas: '1 Cama Queen + 2 Camas Solteiro',
        capacidade: 4,
        precoPadrao: 290
    }
];

function getRoomById(roomId) {
    return ROOMS.find(r => String(r.id) === String(roomId));
}

window.HotelPMS.ROOM_CATEGORIES = ROOM_CATEGORIES;
window.HotelPMS.BLOCKS = BLOCKS;
window.HotelPMS.ROOMS = ROOMS;
window.HotelPMS.getRoomById = getRoomById;
