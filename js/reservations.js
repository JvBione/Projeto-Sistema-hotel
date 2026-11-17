/**
 * reservations.js - Regras de Negócio e Cálculos de Reservas
 */

window.HotelPMS = window.HotelPMS || {};

const RESERVATION_STATUS = {
    CONFIRMADA: {
        id: 'confirmada',
        label: 'Confirmada',
        colorClass: 'status-confirmada',
        badgeClass: 'badge-confirmada',
        icon: '✓'
    },
    PENDENTE: {
        id: 'pendente',
        label: 'Pré-reserva (Pendente)',
        colorClass: 'status-pendente',
        badgeClass: 'badge-pendente',
        icon: '⏳'
    },
    HOSPEDADO: {
        id: 'hospedado',
        label: 'Hospedado (Check-in Ativo)',
        colorClass: 'status-hospedado',
        badgeClass: 'badge-hospedado',
        icon: '🏨'
    },
    FINALIZADA: {
        id: 'finalizada',
        label: 'Check-out Realizado',
        colorClass: 'status-finalizada',
        badgeClass: 'badge-finalizada',
        icon: '🏁'
    },
    BLOQUEIO: {
        id: 'bloqueio',
        label: 'Bloqueio / Manutenção',
        colorClass: 'status-bloqueio',
        badgeClass: 'badge-bloqueio',
        icon: '🔧'
    },
    CANCELADA: {
        id: 'cancelada',
        label: 'Cancelada',
        colorClass: 'status-cancelada',
        badgeClass: 'badge-cancelada',
        icon: '✕'
    }
};

/**
 * Converte string 'YYYY-MM-DD' em objeto Date sem fuso horário
 */
function parseDateString(dateStr) {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/**
 * Formata Date em 'YYYY-MM-DD'
 */
function formatDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function isValidDateString(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')) return false;
    const date = parseDateString(dateStr);
    return !!date && formatDateString(date) === dateStr;
}

/**
 * Formata data no padrão brasileiro DD/MM/YYYY
 */
function formatDateBR(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Calcula quantidade de noites entre Check-in e Check-out
 */
function calculateNights(checkInStr, checkOutStr) {
    const d1 = parseDateString(checkInStr);
    const d2 = parseDateString(checkOutStr);
    if (!d1 || !d2) return 0;
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

/**
 * Verifica se duas faixas de datas se sobrepõem
 * Regra hoteleira padrão: O check-out de um hóspede pode ser no mesmo dia do check-in de outro
 * (intervalo semi-aberto: [checkIn, checkOut))
 */
function datesOverlap(startA, endA, startB, endB) {
    const a1 = parseDateString(startA);
    const a2 = parseDateString(endA);
    const b1 = parseDateString(startB);
    const b2 = parseDateString(endB);

    return a1 < b2 && a2 > b1;
}

/**
 * Valida se um quarto está livre em determinado período
 * Ignora reservas com status 'cancelada' ou a própria reserva sendo editada
 */
function isRoomAvailable(quartoId, checkIn, checkOut, excludeReservationId = null) {
    const reservations = window.HotelPMS.loadReservations();
    
    for (const res of reservations) {
        if (res.id === excludeReservationId) continue;
        if (String(res.quartoId) !== String(quartoId)) continue;
        if (res.status === 'cancelada') continue;

        if (datesOverlap(checkIn, checkOut, res.checkIn, res.checkOut)) {
            return {
                available: false,
                conflictingReservation: res
            };
        }
    }
    
    return { available: true };
}

/**
 * Cria ou atualiza uma reserva
 */
function saveOrUpdateReservation(resData) {
    const reservations = window.HotelPMS.loadReservations();
    
    // Validação básica
    if (!resData.quartoId || !resData.checkIn || !resData.checkOut) {
        return { success: false, error: 'Quarto, Check-in e Check-out são obrigatórios.' };
    }

    if (resData.checkIn >= resData.checkOut) {
        return { success: false, error: 'A data de Check-out deve ser posterior à data de Check-in.' };
    }

    // Validação de Overbooking (não aplicável se for cancelada)
    if (resData.status !== 'cancelada') {
        const check = isRoomAvailable(resData.quartoId, resData.checkIn, resData.checkOut, resData.id);
        if (!check.available) {
            const conflito = check.conflictingReservation;
            return {
                success: false,
                error: `Conflito de datas no Quarto ${resData.quartoId}! Já existe a reserva #${conflito.id.slice(-4)} (${conflito.hospedeNome}) de ${formatDateBR(conflito.checkIn)} a ${formatDateBR(conflito.checkOut)}.`
            };
        }
    }

    // Calcula noites e valores
    const nights = calculateNights(resData.checkIn, resData.checkOut);
    const room = window.HotelPMS.getRoomById(resData.quartoId);
    const diaria = (resData.diaria !== undefined && resData.diaria !== '' && !isNaN(Number(resData.diaria)))
        ? Number(resData.diaria)
        : 0;
    const valorTotal = resData.status === 'bloqueio'
        ? 0
        : ((resData.valorTotal !== undefined && resData.valorTotal !== '' && !isNaN(Number(resData.valorTotal)))
            ? Number(resData.valorTotal)
            : (nights * diaria));
    const valorPago = Number(resData.valorPago) || 0;
    if (resData.status !== 'bloqueio' && (valorPago < 0 || valorPago > valorTotal)) {
        return { success: false, error: 'O valor pago deve estar entre zero e o valor total da reserva.' };
    }
    const saldoPendente = Math.max(0, valorTotal - valorPago);

    // Gera ou preserva a numeração da nota (para reservas de hóspedes)
    let numeroNota = resData.numeroNota || null;
    if (!numeroNota && resData.status !== 'bloqueio') {
        numeroNota = generateNextNotaNumber(reservations);
    }

    const existingReservation = resData.id
        ? reservations.find(r => r.id === resData.id)
        : null;
    const pagamentos = existingReservation && Array.isArray(existingReservation.pagamentos)
        ? existingReservation.pagamentos
        : [];
    const reservationPayload = {
        ...resData,
        numeroNota,
        diaria,
        valorTotal,
        valorPago,
        saldoPendente,
        pagamentos,
        noites: nights,
        atualizadoEm: new Date().toISOString()
    };

    if (!existingReservation && valorPago > 0 && resData.status !== 'bloqueio') {
        reservationPayload.pagamentos = [{
            id: 'pag-' + Date.now(),
            valor: valorPago,
            data: formatDateString(new Date()),
            formaPagamento: resData.formaPagamento || 'Pendente',
            registradoEm: new Date().toISOString()
        }];
    }

    if (resData.id) {
        // Atualizar
        const index = reservations.findIndex(r => r.id === resData.id);
        if (index >= 0) {
            reservations[index] = reservationPayload;
        } else {
            reservations.push(reservationPayload);
        }
    } else {
        // Nova reserva
        reservationPayload.id = 'res-' + Date.now();
        reservationPayload.criadoEm = new Date().toISOString();
        reservations.push(reservationPayload);
    }

    window.HotelPMS.saveReservations(reservations);
    return { success: true, reservation: reservationPayload };
}

/**
 * Registra um recebimento na data em que ele ocorreu
 */
function recordReservationPayment(reservationId, paymentData) {
    const reservations = window.HotelPMS.loadReservations();
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation || reservation.status === 'cancelada' || reservation.status === 'bloqueio') {
        return { success: false, error: 'Reserva não encontrada ou indisponível para recebimento.' };
    }

    const valor = Number(paymentData.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
        return { success: false, error: 'Informe um valor de recebimento maior que zero.' };
    }
    if (!isValidDateString(paymentData.data)) {
        return { success: false, error: 'Informe uma data válida para o recebimento.' };
    }

    const valorPago = Number(reservation.valorPago) || 0;
    const valorTotal = Number(reservation.valorTotal) || 0;
    const saldoPendente = Math.max(0, Math.round((valorTotal - valorPago) * 100) / 100);
    const valorCentavos = Math.round(valor * 100);
    if (valorCentavos <= 0 || valorCentavos > Math.round(saldoPendente * 100)) {
        return { success: false, error: 'O recebimento não pode ser maior que o saldo pendente.' };
    }

    const formaPagamento = String(paymentData.formaPagamento || '').trim();
    if (!formaPagamento) {
        return { success: false, error: 'Selecione a forma de pagamento.' };
    }

    const recebimento = {
        id: 'pag-' + Date.now(),
        valor: valorCentavos / 100,
        data: paymentData.data,
        formaPagamento,
        registradoEm: new Date().toISOString()
    };
    reservation.pagamentos = Array.isArray(reservation.pagamentos)
        ? reservation.pagamentos
        : [];
    reservation.pagamentos.push(recebimento);
    reservation.valorPago = Math.round((valorPago + recebimento.valor) * 100) / 100;
    reservation.saldoPendente = Math.max(0, Math.round((valorTotal - reservation.valorPago) * 100) / 100);
    reservation.formaPagamento = formaPagamento;
    reservation.atualizadoEm = new Date().toISOString();

    if (!window.HotelPMS.saveReservations(reservations)) {
        return { success: false, error: 'Não foi possível salvar o recebimento.' };
    }
    return { success: true, reservation, payment: recebimento };
}

/**
 * Vincula a um dia um valor pago anteriormente, mas ainda sem data registrada
 */
function assignUnattributedReservationPayment(reservationId, paymentData) {
    const reservations = window.HotelPMS.loadReservations();
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation || reservation.status === 'cancelada' || reservation.status === 'bloqueio') {
        return { success: false, error: 'Reserva não encontrada ou indisponível para recebimento.' };
    }

    const valor = Number(paymentData.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
        return { success: false, error: 'Informe um valor maior que zero para vincular.' };
    }
    if (!isValidDateString(paymentData.data)) {
        return { success: false, error: 'Informe uma data válida para o recebimento.' };
    }

    const payments = Array.isArray(reservation.pagamentos) ? reservation.pagamentos : [];
    const recordedTotal = payments.reduce((total, payment) => {
        const amount = Number(payment.valor);
        return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
    }, 0);
    const unattributedAmount = Math.max(
        0,
        Math.round(((Number(reservation.valorPago) || 0) - recordedTotal) * 100) / 100
    );
    const valorCentavos = Math.round(valor * 100);
    if (valorCentavos <= 0 || valorCentavos > Math.round(unattributedAmount * 100)) {
        return { success: false, error: 'O valor informado é maior que o total pago sem data registrada.' };
    }

    const formaPagamento = String(paymentData.formaPagamento || '').trim();
    if (!formaPagamento) {
        return { success: false, error: 'Selecione a forma de pagamento.' };
    }

    const recebimento = {
        id: 'pag-' + Date.now(),
        valor: valorCentavos / 100,
        data: paymentData.data,
        formaPagamento,
        registradoEm: new Date().toISOString(),
        vinculado: true
    };
    reservation.pagamentos = payments;
    reservation.pagamentos.push(recebimento);
    reservation.atualizadoEm = new Date().toISOString();

    if (!window.HotelPMS.saveReservations(reservations)) {
        return { success: false, error: 'Não foi possível salvar a data do recebimento.' };
    }
    return { success: true, reservation, payment: recebimento };
}

/**
 * Remove uma reserva definitivamente
 */
function deleteReservationById(id) {
    const reservations = window.HotelPMS.loadReservations();
    const filtered = reservations.filter(r => r.id !== id);
    window.HotelPMS.saveReservations(filtered);
    return true;
}

/**
 * Atualiza status direto (ex: Realizar Check-in / Check-out)
 */
function updateReservationStatus(id, newStatus) {
    const reservations = window.HotelPMS.loadReservations();
    const res = reservations.find(r => r.id === id);
    if (res) {
        res.status = newStatus;
        res.atualizadoEm = new Date().toISOString();
        window.HotelPMS.saveReservations(reservations);
        return true;
    }
    return false;
}

/**
 * Retorna reservas ativas no mês e ano selecionados
 */
function getReservationsForMonth(year, month) {
    const reservations = window.HotelPMS.loadReservations();
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0); // Último dia do mês

    const startStr = formatDateString(startOfMonth);
    const endStr = formatDateString(new Date(year, month + 1, 1)); // dia 1 do mês seguinte

    return reservations.filter(res => {
        if (res.status === 'cancelada') return false;
        return datesOverlap(res.checkIn, res.checkOut, startStr, endStr);
    });
}

/**
 * Calcula métricas para o Dashboard da Recepção
 */
function getReceptionKPIs() {
    const reservations = window.HotelPMS.loadReservations();
    const todayStr = formatDateString(new Date());
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    let ocupadosHoje = 0;
    let checkInsHoje = 0;
    let checkOutsHoje = 0;
    let faturamentoMes = 0;

    reservations.forEach(r => {
        if (r.status === 'cancelada') return;

        // Ocupados hoje: está dentro do período de estadia
        if (todayStr >= r.checkIn && todayStr < r.checkOut && r.status !== 'finalizada' && r.status !== 'bloqueio') {
            ocupadosHoje++;
        }

        // Check-in previsto para hoje
        if (r.checkIn === todayStr && r.status !== 'finalizada' && r.status !== 'bloqueio') {
            checkInsHoje++;
        }

        // Check-out previsto para hoje
        if (r.checkOut === todayStr && r.status !== 'bloqueio') {
            checkOutsHoje++;
        }

        // Faturamento do mês
        const cIn = parseDateString(r.checkIn);
        if (cIn && cIn.getFullYear() === currentYear && cIn.getMonth() === currentMonth) {
            faturamentoMes += Number(r.valorTotal) || 0;
        }
    });

    const totalQuartos = 32;
    const taxaOcupacao = Math.round((ocupadosHoje / totalQuartos) * 100);

    return {
        totalQuartos,
        ocupadosHoje,
        quartosLivresHoje: totalQuartos - ocupadosHoje,
        checkInsHoje,
        checkOutsHoje,
        taxaOcupacao,
        faturamentoMes
    };
}

/**
 * Gera próxima numeração sequencial de nota de reserva
 */
function generateNextNotaNumber(reservations = []) {
    let maxNum = 1000;
    reservations.forEach(r => {
        if (r.numeroNota) {
            const match = String(r.numeroNota).match(/\d+/);
            if (match) {
                const n = parseInt(match[0], 10);
                if (n > maxNum) maxNum = n;
            }
        }
    });
    return `NF-${maxNum + 1}`;
}

// Anexa ao namespace global
window.HotelPMS.RESERVATION_STATUS = RESERVATION_STATUS;
window.HotelPMS.parseDateString = parseDateString;
window.HotelPMS.formatDateString = formatDateString;
window.HotelPMS.formatDateBR = formatDateBR;
window.HotelPMS.calculateNights = calculateNights;
window.HotelPMS.datesOverlap = datesOverlap;
window.HotelPMS.isRoomAvailable = isRoomAvailable;
window.HotelPMS.saveOrUpdateReservation = saveOrUpdateReservation;
window.HotelPMS.deleteReservationById = deleteReservationById;
window.HotelPMS.updateReservationStatus = updateReservationStatus;
window.HotelPMS.getReservationsForMonth = getReservationsForMonth;
window.HotelPMS.getReceptionKPIs = getReceptionKPIs;
window.HotelPMS.generateNextNotaNumber = generateNextNotaNumber;
window.HotelPMS.recordReservationPayment = recordReservationPayment;
window.HotelPMS.assignUnattributedReservationPayment = assignUnattributedReservationPayment;
