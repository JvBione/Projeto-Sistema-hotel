/**
 * admin.js - Controlador do Painel do Administrador
 * Foco em Gestão Simplificada por Dia, Numerações de Notas & Faturamento Mensal
 */

(() => {
    'use strict';

    const {
        ROOMS,
        getRoomById,
        loadReservations,
        RESERVATION_STATUS,
        formatDateString,
        formatDateBR,
        parseDateString,
        calculateNights,
        saveOrUpdateReservation,
        recordReservationPayment,
        assignUnattributedReservationPayment,
        loadPricingSettings,
        savePricingSettings,
        calculateRoomDailyRate
    } = window.HotelPMS;

    // Estado da Tela do Administrador
    const state = {
        selectedDateStr: formatDateString(new Date()),
        searchQuery: '',
        activeFilter: 'all', // 'all', 'checkin', 'stay', 'checkout', 'pending'
        selectedReservation: null,
        selectedPaymentReservationId: null
    };

    const DAY_NAMES = [
        'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
        'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];

    const MONTH_NAMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Elementos do DOM
    const elements = {
        // Relógio
        clockTime: document.getElementById('clockTime') || document.getElementById('headerCurrentTime'),
        clockDate: document.getElementById('clockDate') || document.getElementById('headerCurrentDate'),

        // Seletor de Dia
        adminDateInput: document.getElementById('adminDateInput'),
        btnAdminPrevDay: document.getElementById('btnAdminPrevDay'),
        btnAdminNextDay: document.getElementById('btnAdminNextDay'),
        btnAdminToday: document.getElementById('btnAdminToday'),
        adminDateLabel: document.getElementById('adminDateLabel'),
        adminDateBadge: document.getElementById('adminDateBadge'),

        // KPIs
        kpiAdminNotesCount: document.getElementById('kpiAdminNotesCount'),
        kpiAdminNotesSubtext: document.getElementById('kpiAdminNotesSubtext'),
        kpiAdminDayRevenue: document.getElementById('kpiAdminDayRevenue'),
        kpiAdminDayDue: document.getElementById('kpiAdminDayDue'),
        kpiAdminMonthRevenue: document.getElementById('kpiAdminMonthRevenue'),
        kpiAdminMonthLabel: document.getElementById('kpiAdminMonthLabel'),

        // Busca e Filtros
        adminSearchInput: document.getElementById('adminSearchInput'),
        adminStatusFilters: document.getElementById('adminStatusFilters'),
        filterCountAll: document.getElementById('filterCountAll'),
        adminResultCountBadge: document.getElementById('adminResultCountBadge'),

        // Configuração de Diárias Pré-definidas (2 Abas: Demais Quartos e Suítes Masters)
        pricingTabs: document.getElementById('pricingTabs'),
        tabDemaisQuartos: document.getElementById('tabDemaisQuartos'),
        tabSuiteMaster: document.getElementById('tabSuiteMaster'),
        panelDemaisQuartos: document.getElementById('panelDemaisQuartos'),
        panelSuiteMaster: document.getElementById('panelSuiteMaster'),

        basePriceDemais: document.getElementById('basePriceDemais'),
        btnAutoCalcDemais: document.getElementById('btnAutoCalcDemais'),
        priceDemais: [
            null,
            document.getElementById('priceDemais1'),
            document.getElementById('priceDemais2'),
            document.getElementById('priceDemais3'),
            document.getElementById('priceDemais4'),
            document.getElementById('priceDemais5')
        ],

        basePriceMaster: document.getElementById('basePriceMaster'),
        btnAutoCalcMaster: document.getElementById('btnAutoCalcMaster'),
        priceMaster: [
            null,
            document.getElementById('priceMaster1'),
            document.getElementById('priceMaster2')
        ],
        btnSavePricing: document.getElementById('btnSavePricing'),

        // Contêiner de Reservas
        adminReservationsContainer: document.getElementById('adminReservationsContainer'),

        // Modal de notas com saldo em aberto
        btnAdminOpenReceivables: document.getElementById('btnAdminOpenReceivables'),
        adminReceivablesBadge: document.getElementById('adminReceivablesBadge'),
        adminReceivablesModal: document.getElementById('adminReceivablesModal'),
        adminReceivablesNoteSearch: document.getElementById('adminReceivablesNoteSearch'),
        adminReceivablesDateFilter: document.getElementById('adminReceivablesDateFilter'),
        adminReceivablesResultCount: document.getElementById('adminReceivablesResultCount'),
        adminReceivablesList: document.getElementById('adminReceivablesList'),
        btnCloseAdminReceivables: document.getElementById('btnCloseAdminReceivables'),
        btnCloseAdminReceivablesFooter: document.getElementById('btnCloseAdminReceivablesFooter'),
        btnClearAdminReceivablesFilters: document.getElementById('btnClearAdminReceivablesFilters'),

        // Modal de recebimento
        paymentModal: document.getElementById('paymentModal'),
        paymentForm: document.getElementById('paymentForm'),
        paymentReservationInfo: document.getElementById('paymentReservationInfo'),
        paymentDate: document.getElementById('paymentDate'),
        paymentAmount: document.getElementById('paymentAmount'),
        paymentBalance: document.getElementById('paymentBalance'),
        paymentLegacyBalance: document.getElementById('paymentLegacyBalance'),
        paymentMethod: document.getElementById('paymentMethod'),
        paymentHistory: document.getElementById('paymentHistory'),
        btnClosePaymentModal: document.getElementById('btnClosePaymentModal'),
        btnCancelPayment: document.getElementById('btnCancelPayment'),
        btnAssignLegacyPayment: document.getElementById('btnAssignLegacyPayment'),

        // Modal Voucher
        voucherModal: document.getElementById('voucherModal'),
        voucherContent: document.getElementById('voucherContent'),
        btnCloseVoucherModal: document.getElementById('btnCloseVoucherModal'),
        btnCloseVoucherBtn: document.getElementById('btnCloseVoucherBtn'),
        btnPrintVoucher: document.getElementById('btnPrintVoucher'),
        btnCopyWhatsApp: document.getElementById('btnCopyWhatsApp'),

        // Toasts
        toastContainer: document.getElementById('toastContainer'),
        btnAdminLogout: document.getElementById('btnAdminLogout')
    };

    // ==========================================================================
    // SISTEMA DE TOASTS
    // ==========================================================================
    function showToast(message, type = 'info') {
        if (!elements.toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };

        toast.innerHTML = `
            <span>${icons[type] || 'ℹ️'}</span>
            <span>${message}</span>
        `;

        elements.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // ==========================================================================
    // RELÓGIO AO VIVO
    // ==========================================================================
    function initLiveClock() {
        const update = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

            if (elements.clockTime) elements.clockTime.textContent = timeStr;
            if (elements.clockDate) elements.clockDate.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        };
        update();
        setInterval(update, 1000);
    }

    // ==========================================================================
    // FORMATAÇÃO E UTILITÁRIOS
    // ==========================================================================
    function formatCurrency(val) {
        return Number(val || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    function formatFullDate(date) {
        const dayName = DAY_NAMES[date.getDay()];
        const day = date.getDate();
        const monthName = MONTH_NAMES[date.getMonth()];
        const year = date.getFullYear();
        return `${dayName}, ${day} de ${monthName} de ${year}`;
    }

    function getRelativeDateLabel(targetDateStr) {
        const todayStr = formatDateString(new Date());
        if (targetDateStr === todayStr) return { text: 'Hoje', class: 'badge-today' };

        const target = parseDateString(targetDateStr);
        const today = parseDateString(todayStr);
        const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return { text: 'Amanhã', class: 'badge-future' };
        if (diffDays === -1) return { text: 'Ontem', class: 'badge-past' };
        if (diffDays > 1) return { text: `Em ${diffDays} dias`, class: 'badge-future' };
        return { text: `${Math.abs(diffDays)} dias atrás`, class: 'badge-past' };
    }

    // ==========================================================================
    // NAVEGAÇÃO ENTRE DIAS
    // ==========================================================================
    function setSelectedDate(date) {
        state.selectedDateStr = formatDateString(date);
        if (elements.adminDateInput) {
            elements.adminDateInput.value = formatAdminDateInput(date);
        }
        updateDateHeader();
        renderAdminDashboard();
    }

    function formatAdminDateInput(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}/${month}/${year}`;
    }

    function parseAdminDateInput(value) {
        const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value.trim());
        if (!match) return null;

        const day = Number(match[1]);
        const month = Number(match[2]);
        const year = 2000 + Number(match[3]);
        const date = new Date(year, month - 1, day);
        if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
            return null;
        }
        return date;
    }

    function updateDateHeader() {
        const dateObj = parseDateString(state.selectedDateStr);
        if (!dateObj) return;

        if (elements.adminDateLabel) {
            elements.adminDateLabel.textContent = formatFullDate(dateObj);
        }

        if (elements.adminDateBadge) {
            const rel = getRelativeDateLabel(state.selectedDateStr);
            elements.adminDateBadge.textContent = rel.text;
            elements.adminDateBadge.className = `admin-date-tag ${rel.class}`;
        }
    }

    function stepDay(offset) {
        const current = parseDateString(state.selectedDateStr);
        current.setDate(current.getDate() + offset);
        setSelectedDate(current);
    }

    // ==========================================================================
    // CÁLCULOS E RENDERIZAÇÃO DO PAINEL DO ADMINISTRADOR
    // ==========================================================================
    function renderAdminDashboard() {
        const allReservations = loadReservations();
        const selectedDateStr = state.selectedDateStr;
        const selectedDateObj = parseDateString(selectedDateStr);
        const selYear = selectedDateObj.getFullYear();
        const selMonth = selectedDateObj.getMonth();

        // Reservas válidas (não canceladas e não de manutenção/bloqueio)
        const validReservations = allReservations.filter(
            r => r.status !== 'cancelada' && r.status !== 'bloqueio'
        );
        updateAdminReceivablesBadge(validReservations);

        // Inclui também reservas com recebimentos lançados na data selecionada.
        const dayReservations = validReservations.map(r => {
            let relation = 'stay';
            if (r.checkIn === selectedDateStr) {
                relation = 'checkin';
            } else if (r.checkOut === selectedDateStr) {
                relation = 'checkout';
            } else if (selectedDateStr > r.checkIn && selectedDateStr < r.checkOut) {
                relation = 'stay';
            } else {
                const hasPaymentOnDate = Array.isArray(r.pagamentos) &&
                    r.pagamentos.some(payment => payment.data === selectedDateStr);
                if (!hasPaymentOnDate) return null;
                relation = 'payment';
            }

            return {
                ...r,
                relation
            };
        }).filter(Boolean);

        // 1. KPI: Recebimentos realizados no mês selecionado
        const selectedMonthKey = `${selYear}-${String(selMonth + 1).padStart(2, '0')}`;
        let monthlyRevenue = 0;
        validReservations.forEach(reservation => {
            const payments = Array.isArray(reservation.pagamentos) ? reservation.pagamentos : [];
            let recordedPaymentsTotal = 0;
            let paymentsWithoutDateTotal = 0;
            payments.forEach(payment => {
                const amount = Number(payment.valor);
                if (!Number.isFinite(amount) || amount <= 0) return;
                recordedPaymentsTotal += amount;

                const paymentDate = typeof payment.data === 'string' ? payment.data : '';
                const parsedPaymentDate = parseDateString(paymentDate);
                const hasValidPaymentDate = parsedPaymentDate &&
                    formatDateString(parsedPaymentDate) === paymentDate;
                if (!hasValidPaymentDate) {
                    paymentsWithoutDateTotal += amount;
                } else if (paymentDate.slice(0, 7) === selectedMonthKey) {
                    monthlyRevenue += amount;
                }
            });

            const paidTotal = Number(reservation.valorPago);
            const unrecordedPaidTotal = Math.max(
                0,
                (Number.isFinite(paidTotal) ? paidTotal : 0) - recordedPaymentsTotal
            );
            const unattributedPaidTotal = paymentsWithoutDateTotal + unrecordedPaidTotal;
            const registrationDate = [
                String(reservation.criadoEm || '').slice(0, 10),
                String(reservation.checkIn || '').slice(0, 10)
            ].find(date => {
                const parsedDate = parseDateString(date);
                return parsedDate && formatDateString(parsedDate) === date;
            }) || '';
            const registrationMonth = registrationDate.slice(0, 7);

            // Pagamentos antigos sem data ficam atribuídos ao mês de cadastro da reserva.
            if (registrationMonth === selectedMonthKey) {
                monthlyRevenue += unattributedPaidTotal;
            }
        });

        if (elements.kpiAdminMonthRevenue) {
            elements.kpiAdminMonthRevenue.textContent = formatCurrency(monthlyRevenue);
        }
        if (elements.kpiAdminMonthLabel) {
            elements.kpiAdminMonthLabel.textContent = `Total recebido em ${MONTH_NAMES[selMonth]}/${selYear}`;
        }

        // 2. KPIs do Dia Selecionado
        const totalNotesToday = dayReservations.length;
        const dayTotalPaid = validReservations.reduce((total, reservation) => {
            if (!Array.isArray(reservation.pagamentos)) return total;
            return total + reservation.pagamentos.reduce((paymentTotal, payment) => {
                if (payment.data !== selectedDateStr) return paymentTotal;
                const amount = Number(payment.valor);
                return paymentTotal + (Number.isFinite(amount) && amount > 0 ? amount : 0);
            }, 0);
        }, 0);
        const totalOutstandingBalance = validReservations.reduce((total, reservation) => {
            const balance = Number(reservation.saldoPendente !== undefined
                ? reservation.saldoPendente
                : (Number(reservation.valorTotal) - Number(reservation.valorPago)));
            return total + Math.max(0, Number.isFinite(balance) ? balance : 0);
        }, 0);
        let countCheckin = 0;
        let countCheckout = 0;
        let countStay = 0;

        dayReservations.forEach(r => {
            if (r.relation === 'checkin') countCheckin++;
            else if (r.relation === 'checkout') countCheckout++;
            else if (r.relation === 'stay') countStay++;

        });

        if (elements.kpiAdminNotesCount) {
            elements.kpiAdminNotesCount.textContent = totalNotesToday;
        }
        if (elements.kpiAdminNotesSubtext) {
            elements.kpiAdminNotesSubtext.textContent = `${countCheckin} check-in(s) • ${countStay} em estadia • ${countCheckout} check-out(s)`;
        }
        if (elements.kpiAdminDayRevenue) {
            elements.kpiAdminDayRevenue.textContent = formatCurrency(dayTotalPaid);
        }
        if (elements.kpiAdminDayDue) {
            elements.kpiAdminDayDue.textContent = formatCurrency(totalOutstandingBalance);
        }

        // Atualizar contador do botão "Todas as Notas"
        if (elements.filterCountAll) {
            elements.filterCountAll.textContent = totalNotesToday;
        }

        // 3. Filtrar e Buscar Reservas para Exibição
        const pendingReservations = validReservations
            .filter(r => {
                const balance = Number(r.saldoPendente !== undefined
                    ? r.saldoPendente
                    : (Number(r.valorTotal) - Number(r.valorPago)));
                return Number.isFinite(balance) && balance > 0;
            })
            .map(r => dayReservations.find(dayReservation => dayReservation.id === r.id) || {
                ...r,
                relation: 'pending'
            });
        const sourceReservations = state.activeFilter === 'pending'
            ? pendingReservations
            : dayReservations;
        const filtered = sourceReservations.filter(r => {
            // Filtro por Status/Relação
            if (state.activeFilter === 'checkin' && r.relation !== 'checkin') return false;
            if (state.activeFilter === 'stay' && r.relation !== 'stay') return false;
            if (state.activeFilter === 'checkout' && r.relation !== 'checkout') return false;
            // Filtro por Texto de Busca
            if (state.searchQuery) {
                const q = state.searchQuery.toLowerCase();
                const room = getRoomById(r.quartoId);
                const roomNum = room ? String(room.numero).toLowerCase() : '';
                const nota = String(r.numeroNota || '').toLowerCase();
                const nome = String(r.hospedeNome || '').toLowerCase();
                const tel = String(r.hospedeTelefone || '').toLowerCase();
                const cpf = String(r.hospedeCpf || '').toLowerCase();

                return nota.includes(q) || nome.includes(q) || roomNum.includes(q) || tel.includes(q) || cpf.includes(q);
            }

            return true;
        });

        // Atualizar badge de resultados
        if (elements.adminResultCountBadge) {
            const resultScope = state.activeFilter === 'pending'
                ? pendingReservations.length
                : totalNotesToday;
            elements.adminResultCountBadge.textContent = `Mostrando ${filtered.length} de ${resultScope} nota(s)/reserva(s)`;
        }

        // 4. Renderizar Lista de Reservas
        renderReservationsList(filtered);
    }

    function getOpenAdminReceivables() {
        return loadReservations().filter(reservation => {
            if (reservation.status === 'cancelada' || reservation.status === 'bloqueio') return false;
            const balance = Number(reservation.saldoPendente !== undefined
                ? reservation.saldoPendente
                : (Number(reservation.valorTotal) - Number(reservation.valorPago)));
            return Number.isFinite(balance) && balance > 0;
        });
    }

    function updateAdminReceivablesBadge(reservations = getOpenAdminReceivables()) {
        if (!elements.adminReceivablesBadge) return;
        const count = reservations.filter(reservation => {
            const balance = Number(reservation.saldoPendente !== undefined
                ? reservation.saldoPendente
                : (Number(reservation.valorTotal) - Number(reservation.valorPago)));
            return Number.isFinite(balance) && balance > 0;
        }).length;
        elements.adminReceivablesBadge.textContent = count;
        elements.adminReceivablesBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    function renderAdminReceivables() {
        const allReservations = getOpenAdminReceivables();
        const noteQuery = elements.adminReceivablesNoteSearch.value.trim().toLocaleLowerCase('pt-BR');
        const selectedDate = elements.adminReceivablesDateFilter.value;
        const reservations = allReservations.filter(reservation => {
            const noteNumber = String(reservation.numeroNota || '').toLocaleLowerCase('pt-BR');
            if (noteQuery && !noteNumber.includes(noteQuery)) return false;

            if (selectedDate) {
                const isStayDate = reservation.checkIn <= selectedDate && selectedDate <= reservation.checkOut;
                const hasPaymentOnDate = Array.isArray(reservation.pagamentos) &&
                    reservation.pagamentos.some(payment => payment.data === selectedDate);
                if (!isStayDate && !hasPaymentOnDate) return false;
            }
            return true;
        });

        elements.adminReceivablesList.replaceChildren();
        elements.adminReceivablesResultCount.textContent =
            `Mostrando ${reservations.length} de ${allReservations.length} nota(s) com saldo em aberto.`;

        if (reservations.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'text-align: center; padding: 36px 16px; color: var(--text-muted);';
            empty.textContent = allReservations.length === 0
                ? 'Todas as notas estão quitadas. Não há saldo pendente.'
                : 'Nenhuma nota em aberto corresponde aos filtros selecionados.';
            elements.adminReceivablesList.appendChild(empty);
            return;
        }

        reservations.sort((a, b) => String(a.checkOut).localeCompare(String(b.checkOut)));
        reservations.forEach(reservation => {
            const room = getRoomById(reservation.quartoId);
            const balance = Math.max(0, Number(reservation.saldoPendente !== undefined
                ? reservation.saldoPendente
                : (Number(reservation.valorTotal) - Number(reservation.valorPago))));
            const card = document.createElement('article');
            card.style.cssText = 'display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; padding: 16px; margin-bottom: 12px; background: rgba(255,255,255,0.025); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);';

            const details = document.createElement('div');
            details.style.cssText = 'display: flex; flex-direction: column; gap: 6px; min-width: 220px; flex: 1;';
            const note = document.createElement('strong');
            note.style.color = 'var(--text-gold)';
            note.textContent = `${reservation.numeroNota || 'Reserva sem nota'} • Quarto ${room ? room.numero : reservation.quartoId}`;
            details.appendChild(note);

            const guest = document.createElement('span');
            guest.style.color = 'var(--text-primary)';
            guest.textContent = reservation.hospedeNome || 'Hóspede não informado';
            details.appendChild(guest);

            const dates = document.createElement('span');
            dates.style.cssText = 'font-size: 0.8rem; color: var(--text-muted);';
            dates.textContent = `Check-in ${formatDateBR(reservation.checkIn)} • Check-out ${formatDateBR(reservation.checkOut)}`;
            details.appendChild(dates);

            const totals = document.createElement('span');
            totals.style.cssText = 'font-size: 0.82rem; color: var(--text-secondary);';
            totals.textContent = `Total ${formatCurrency(reservation.valorTotal)} • Pago ${formatCurrency(reservation.valorPago)}`;
            details.appendChild(totals);

            const actions = document.createElement('div');
            actions.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; gap: 8px;';
            const amount = document.createElement('strong');
            amount.style.cssText = 'color: #fbbf24; font-size: 1.05rem;';
            amount.textContent = `Saldo: ${formatCurrency(balance)}`;
            actions.appendChild(amount);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-primary btn-sm';
            button.dataset.reservationId = reservation.id;
            button.textContent = '💳 Registrar recebimento';
            actions.appendChild(button);

            card.append(details, actions);
            elements.adminReceivablesList.appendChild(card);
        });
    }

    function openAdminReceivablesModal() {
        renderAdminReceivables();
        elements.adminReceivablesModal.classList.add('active');
    }

    function closeAdminReceivablesModal() {
        elements.adminReceivablesModal.classList.remove('active');
    }

    function renderReservationsList(reservations) {
        const container = elements.adminReservationsContainer;
        if (!container) return;

        if (reservations.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
                    <div style="font-size: 3.2rem; margin-bottom: 14px; opacity: 0.8;">📄</div>
                    <h4 style="color: var(--text-primary); font-size: 1.15rem; font-weight: 700; margin-bottom: 6px;">
                        ${state.activeFilter === 'pending' ? 'Nenhuma nota com saldo pendente' : 'Nenhuma nota fiscal ou reserva para este dia'}
                    </h4>
                    <p style="font-size: 0.875rem; max-width: 460px; margin: 0 auto; line-height: 1.5;">
                        ${state.searchQuery || state.activeFilter !== 'all' 
                            ? (state.activeFilter === 'pending'
                                ? 'Todas as notas estão quitadas ou nenhum resultado corresponde à busca.'
                                : 'Nenhum resultado corresponde aos filtros aplicados. Tente limpar a busca ou selecionar "Todas as Notas".')
                            : 'Não há quartos ocupados, chegadas ou saídas registradas para esta data.'}
                    </p>
                </div>
            `;
            return;
        }

        const cardsHtml = reservations.map(r => {
            const room = getRoomById(r.quartoId);
            const nights = r.noites || calculateNights(r.checkIn, r.checkOut);
            const statusConfig = RESERVATION_STATUS[r.status.toUpperCase()] || { label: r.status, badgeClass: 'badge-confirmada' };
            const pendente = Number(r.saldoPendente !== undefined ? r.saldoPendente : (Number(r.valorTotal) - Number(r.valorPago)));

            let relationBadge = '';
            if (r.relation === 'checkin') {
                relationBadge = `<span style="background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.72rem;">📥 Check-in Hoje</span>`;
            } else if (r.relation === 'checkout') {
                relationBadge = `<span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.72rem;">📤 Check-out Hoje</span>`;
            } else if (r.relation === 'payment') {
                relationBadge = `<span style="background: rgba(212, 163, 115, 0.15); color: var(--text-gold); border: 1px solid rgba(212, 163, 115, 0.4); padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.72rem;">💰 Recebimento nesta data</span>`;
            } else if (r.relation === 'pending') {
                relationBadge = `<span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.72rem;">⚠️ Nota em aberto</span>`;
            } else {
                relationBadge = `<span style="background: rgba(6, 182, 212, 0.15); color: #38bdf8; border: 1px solid rgba(6, 182, 212, 0.4); padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 0.72rem;">🏨 Em Estadia</span>`;
            }

            const payments = Array.isArray(r.pagamentos) ? r.pagamentos : [];
            const paidOnSelectedDate = payments.reduce((total, payment) => {
                if (payment.data !== state.selectedDateStr) return total;
                const amount = Number(payment.valor);
                return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
            }, 0);
            const registeredPaymentTotal = payments.reduce((total, payment) => {
                const amount = Number(payment.valor);
                return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
            }, 0);
            const legacyPaidWithoutDate = Math.max(0, (Number(r.valorPago) || 0) - registeredPaymentTotal);

            return `
                <div class="admin-res-card" data-id="${r.id}" style="
                    background: rgba(255, 255, 255, 0.025);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    padding: 16px;
                    margin-bottom: 12px;
                    display: grid;
                    grid-template-columns: auto 1fr auto;
                    gap: 16px;
                    align-items: center;
                    transition: all 0.2s ease;
                ">
                    <!-- Bloco da Nota e Quarto -->
                    <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start; min-width: 140px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span class="admin-note-badge" style="
                                background: linear-gradient(135deg, rgba(212, 163, 115, 0.25) 0%, rgba(176, 125, 75, 0.25) 100%);
                                border: 1px solid var(--accent-gold);
                                color: var(--accent-gold-light);
                                font-weight: 800;
                                font-size: 0.95rem;
                                padding: 4px 10px;
                                border-radius: 8px;
                                letter-spacing: 0.05em;
                                box-shadow: 0 2px 8px rgba(212, 163, 115, 0.2);
                            ">
                                📋 ${r.numeroNota || 'S/N'}
                            </span>
                        </div>
                        
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-weight: 800; font-size: 1.05rem; color: #fff;">
                                Quarto ${room ? room.numero : r.quartoId}
                            </span>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">
                                • ${room ? room.categoria.nome : ''}
                            </span>
                        </div>
                        
                        <div>${relationBadge}</div>
                    </div>

                    <!-- Bloco Central: Hóspede, Contato e Período -->
                    <div style="display: flex; flex-direction: column; gap: 6px;">
                        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                            <strong style="font-size: 1.05rem; color: var(--text-primary); font-weight: 700;">
                                👤 ${r.hospedeNome}
                            </strong>
                            <span class="status-badge ${statusConfig.badgeClass}" style="font-size: 0.72rem; padding: 2px 8px;">
                                ${statusConfig.label}
                            </span>
                        </div>

                        <div style="display: flex; gap: 14px; font-size: 0.8rem; color: var(--text-secondary); flex-wrap: wrap;">
                            <span>📱 WhatsApp: <strong style="color: #fff;">${r.hospedeTelefone || '-'}</strong></span>
                            ${r.hospedeCpf ? `<span>🪪 CPF: <strong style="color: #fff;">${r.hospedeCpf}</strong></span>` : ''}
                            ${r.hospedeCidade ? `<span>📍 Cidade: <strong style="color: #fff;">${r.hospedeCidade}</strong></span>` : ''}
                            <span>👥 ${r.adultos || 1} adulto(s)${r.criancas ? ` e ${r.criancas} criança(s)` : ''}</span>
                        </div>

                        <div style="display: flex; gap: 16px; font-size: 0.82rem; color: var(--text-muted); align-items: center; margin-top: 4px; flex-wrap: wrap;">
                            <span>📅 Entrada: <strong style="color: #38bdf8;">${formatDateBR(r.checkIn)}</strong></span>
                            <span>➔</span>
                            <span>📅 Saída: <strong style="color: #38bdf8;">${formatDateBR(r.checkOut)}</strong></span>
                            <span>(${nights} diária${nights !== 1 ? 's' : ''})</span>
                        </div>
                    </div>

                    <!-- Bloco Direito: Valores e Botão de Ação -->
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px; min-width: 170px;">
                        <div style="text-align: right;">
                            <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">
                                Diária Proposta
                            </div>
                            <div style="font-size: 1rem; font-weight: 800; color: #fff;">
                                ${formatCurrency(r.diaria || 0)}
                            </div>
                        </div>

                        <div style="display: flex; gap: 10px; font-size: 0.75rem; text-align: right;">
                            <div>
                                <span style="color: var(--text-muted);">Total:</span>
                                <strong style="color: #fff;"> ${formatCurrency(r.valorTotal)}</strong>
                            </div>
                            <div>
                                <span style="color: var(--text-muted);">Total pago:</span>
                                <strong style="color: #34d399;"> ${formatCurrency(r.valorPago)}</strong>
                            </div>
                        </div>

                        ${pendente > 0 ? `
                            <div style="font-size: 0.75rem; color: #fbbf24; font-weight: 700;">
                                ⚠️ Saldo Pendente: ${formatCurrency(pendente)}
                            </div>
                        ` : `
                            <div style="font-size: 0.75rem; color: #34d399; font-weight: 700;">
                                ✓ Totalmente Pago (${r.formaPagamento || 'PIX'})
                            </div>
                        `}

                        ${paidOnSelectedDate > 0 ? `
                            <div style="font-size: 0.75rem; color: #34d399; font-weight: 700;">
                                💰 Recebido nesta data: ${formatCurrency(paidOnSelectedDate)}
                            </div>
                        ` : ''}
                        ${legacyPaidWithoutDate > 0 ? `
                            <div style="font-size: 0.7rem; color: var(--text-muted);">
                                ${formatCurrency(legacyPaidWithoutDate)} pagos sem data registrada
                            </div>
                        ` : ''}

                        <div style="margin-top: 4px;">
                            ${pendente > 0 || legacyPaidWithoutDate > 0 ? `
                                <button type="button" class="btn btn-primary btn-sm btn-record-payment" data-id="${r.id}" style="margin-right: 6px;">
                                    ${pendente > 0 ? '💳 Registrar recebimento' : '📅 Associar pagamento'}
                                </button>
                            ` : ''}
                            <button type="button" class="btn btn-secondary btn-sm btn-open-voucher" data-id="${r.id}" style="
                                display: inline-flex;
                                align-items: center;
                                gap: 6px;
                                font-weight: 600;
                            ">
                                🧾 Ver Comprovante
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = cardsHtml;

        // Adicionar eventos aos botões de Comprovante
        container.querySelectorAll('.btn-open-voucher').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const resId = e.currentTarget.dataset.id;
                const res = reservations.find(r => r.id === resId);
                if (res) openVoucherModal(res);
            });
        });
        container.querySelectorAll('.btn-record-payment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                openPaymentModal(e.currentTarget.dataset.id);
            });
        });
    }

    function openPaymentModal(reservationId) {
        const reservation = loadReservations().find(r => r.id === reservationId);
        if (!reservation) {
            showToast('Não foi possível localizar a reserva.', 'error');
            return;
        }

        const balance = Math.max(0, Number(reservation.valorTotal || 0) - Number(reservation.valorPago || 0));
        const payments = Array.isArray(reservation.pagamentos) ? reservation.pagamentos : [];
        const registeredTotal = payments.reduce((total, payment) => {
            const amount = Number(payment.valor);
            return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
        }, 0);
        const legacyPaid = Math.max(0, (Number(reservation.valorPago) || 0) - registeredTotal);
        if (balance <= 0 && legacyPaid <= 0) {
            showToast('Esta reserva não possui saldo pendente.', 'info');
            return;
        }

        state.selectedPaymentReservationId = reservationId;
        elements.paymentForm.reset();
        elements.paymentDate.value = elements.adminReceivablesModal.classList.contains('active')
            ? (elements.adminReceivablesDateFilter.value || state.selectedDateStr)
            : state.selectedDateStr;
        elements.paymentAmount.value = '';
        elements.paymentAmount.max = Math.max(balance, legacyPaid).toFixed(2);
        elements.paymentBalance.textContent = `Saldo pendente para novos pagamentos: ${formatCurrency(balance)}`;
        elements.paymentLegacyBalance.textContent = legacyPaid > 0
            ? `Pago anteriormente sem data: ${formatCurrency(legacyPaid)}. Você pode associar esse valor à data selecionada.`
            : '';
        elements.btnAssignLegacyPayment.hidden = legacyPaid <= 0;
        elements.btnAssignLegacyPayment.disabled = legacyPaid <= 0;
        elements.paymentReservationInfo.textContent =
            `${reservation.numeroNota || 'Reserva'} • ${reservation.hospedeNome || 'Hóspede'} • Quarto ${reservation.quartoId}`;
        renderPaymentHistory(reservation);
        elements.paymentModal.classList.add('active');
    }

    function renderPaymentHistory(reservation) {
        const payments = Array.isArray(reservation.pagamentos) ? reservation.pagamentos : [];
        elements.paymentHistory.replaceChildren();

        const title = document.createElement('strong');
        title.textContent = 'Recebimentos registrados';
        elements.paymentHistory.appendChild(title);

        if (payments.length === 0) {
            const empty = document.createElement('p');
            empty.textContent = Number(reservation.valorPago) > 0
                ? 'O valor pago anteriormente não possui data registrada.'
                : 'Nenhum recebimento registrado.';
            elements.paymentHistory.appendChild(empty);
            return;
        }

        const list = document.createElement('ul');
        list.style.paddingLeft = '20px';
        list.style.margin = '6px 0 0';
        payments.slice().sort((a, b) => String(b.data).localeCompare(String(a.data))).forEach(payment => {
            const item = document.createElement('li');
            item.textContent = `${formatDateBR(payment.data)} • ${formatCurrency(payment.valor)} • ${payment.formaPagamento || 'Forma não informada'}`;
            list.appendChild(item);
        });
        elements.paymentHistory.appendChild(list);
    }

    function closePaymentModal() {
        elements.paymentModal.classList.remove('active');
        state.selectedPaymentReservationId = null;
    }

    // ==========================================================================
    // MODAL DE COMPROVANTE / VOUCHER
    // ==========================================================================
    function openVoucherModal(res) {
        if (!res) return;
        state.selectedReservation = res;
        const room = getRoomById(res.quartoId);
        const nights = res.noites || calculateNights(res.checkIn, res.checkOut);
        const pendente = Number(res.saldoPendente !== undefined ? res.saldoPendente : (Number(res.valorTotal) - Number(res.valorPago)));

        const voucherHtml = `
            <div class="voucher-header">
                <div>
                    <h2>🌿 HOTEL DAS OLIVEIRAS</h2>
                    <p style="color: #64748b; font-size: 0.8rem; margin: 0;">Comprovante Oficial de Reserva • Administração</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 800; font-size: 1.15rem; color: #0f172a;">
                        ${res.numeroNota ? `Nota: ${res.numeroNota}` : `#${res.id.slice(-6)}`}
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b;">
                        Emissão: ${new Date().toLocaleDateString('pt-BR')}
                    </div>
                </div>
            </div>

            <div class="voucher-section-title">Dados do Hóspede & Reserva</div>
            <div class="voucher-grid">
                <div class="voucher-field"><strong>Número da Nota:</strong> <span style="font-weight: 800; color: #0284c7;">${res.numeroNota || 'S/N'}</span></div>
                <div class="voucher-field"><strong>Hóspede Titular:</strong> ${res.hospedeNome}</div>
                <div class="voucher-field"><strong>WhatsApp:</strong> ${res.hospedeTelefone}</div>
                <div class="voucher-field"><strong>CPF:</strong> ${res.hospedeCpf || 'Não informado'}</div>
                <div class="voucher-field"><strong>Cidade:</strong> ${res.hospedeCidade || 'Não informada'}</div>
            </div>

            <div class="voucher-section-title">Acomodação & Período</div>
            <div class="voucher-grid">
                <div class="voucher-field"><strong>Quarto:</strong> Quarto ${room ? room.numero : res.quartoId} (${room ? room.categoria.nome : ''})</div>
                <div class="voucher-field"><strong>Localização:</strong> ${room ? room.blocoNome : ''}</div>
                <div class="voucher-field"><strong>Check-in:</strong> ${formatDateBR(res.checkIn)} (A partir das 14:00)</div>
                <div class="voucher-field"><strong>Check-out:</strong> ${formatDateBR(res.checkOut)} (Até as 12:00)</div>
                <div class="voucher-field"><strong>Duração:</strong> ${nights} diária${nights !== 1 ? 's' : ''}</div>
                <div class="voucher-field"><strong>Hóspedes:</strong> ${res.adultos || 2} adultos, ${res.criancas || 0} crianças</div>
            </div>

            <div class="voucher-section-title">Resumo Financeiro</div>
            <div class="voucher-grid">
                <div class="voucher-field"><strong>Valor da Diária:</strong> ${formatCurrency(res.diaria || 0)}</div>
                <div class="voucher-field"><strong>Valor Total:</strong> ${formatCurrency(res.valorTotal)}</div>
                <div class="voucher-field"><strong>Valor Pago / Sinal:</strong> ${formatCurrency(res.valorPago)} (${res.formaPagamento || 'PIX'})</div>
                <div class="voucher-field"><strong>Saldo Restante:</strong> <span style="color: ${pendente > 0 ? '#d97706' : '#059669'}; font-weight: 800;">${formatCurrency(pendente)}</span></div>
            </div>

            ${res.observacoes ? `
                <div class="voucher-section-title">Observações</div>
                <p style="font-size: 0.85rem; color: #334155; margin: 4px 0;">${res.observacoes}</p>
            ` : ''}

            <div style="margin-top: 24px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 0.75rem; color: #64748b; text-align: center;">
                Comprovante gerado via Painel Administrativo • Hotel das Oliveiras.
            </div>
        `;

        if (elements.voucherContent) elements.voucherContent.innerHTML = voucherHtml;
        if (elements.voucherModal) elements.voucherModal.classList.add('active');
    }

    function closeVoucherModal() {
        if (elements.voucherModal) elements.voucherModal.classList.remove('active');
    }

    function copyVoucherWhatsApp(res) {
        if (!res) return;
        const room = getRoomById(res.quartoId);
        const nights = res.noites || calculateNights(res.checkIn, res.checkOut);
        const pendente = Number(res.saldoPendente !== undefined ? res.saldoPendente : (Number(res.valorTotal) - Number(res.valorPago)));

        const msg = 
`*🌿 HOTEL DAS OLIVEIRAS - COMPROVANTE DE RESERVA*
----------------------------------------
Olá, *${res.hospedeNome}*! Seguem os dados da sua reserva:

📋 *Nota de Reserva:* ${res.numeroNota || `#${res.id.slice(-6)}`}
🏨 *Acomodação:* Quarto ${room ? room.numero : res.quartoId} - ${room ? room.categoria.nome : ''} (${room ? room.blocoNome : ''})
📅 *Check-in:* ${formatDateBR(res.checkIn)} (14h)
📅 *Check-out:* ${formatDateBR(res.checkOut)} (12h)
🌙 *Estadia:* ${nights} noite(s)
👥 *Hóspedes:* ${res.adultos || 2} adulto(s)${res.criancas ? ` e ${res.criancas} criança(s)` : ''}

💰 *Diária Proposta:* ${formatCurrency(res.diaria || 0)}
💵 *Valor Total:* ${formatCurrency(res.valorTotal)}
💳 *Valor Pago:* ${formatCurrency(res.valorPago)} (${res.formaPagamento || 'PIX'})
⚠️ *Saldo Restante:* ${formatCurrency(pendente)}

Qualquer dúvida estamos à disposição no Hotel das Oliveiras!`;

        navigator.clipboard.writeText(msg).then(() => {
            showToast('Texto do comprovante copiado com sucesso! Basta colar no WhatsApp.', 'success');
        }).catch(() => {
            showToast('Não foi possível copiar automaticamente.', 'error');
        });
    }

    // ==========================================================================
    // CONFIGURAÇÃO DE LISTENERS
    // ==========================================================================
    function setupEventListeners() {
        if (elements.btnClosePaymentModal) {
            elements.btnClosePaymentModal.addEventListener('click', closePaymentModal);
        }
        if (elements.btnCancelPayment) {
            elements.btnCancelPayment.addEventListener('click', closePaymentModal);
        }
        if (elements.paymentModal) {
            elements.paymentModal.addEventListener('click', (event) => {
                if (event.target === elements.paymentModal) closePaymentModal();
            });
        }
        if (elements.paymentForm) {
            elements.paymentForm.addEventListener('submit', (event) => {
                event.preventDefault();
                if (!state.selectedPaymentReservationId) return;

                const result = recordReservationPayment(state.selectedPaymentReservationId, {
                    valor: elements.paymentAmount.value,
                    data: elements.paymentDate.value,
                    formaPagamento: elements.paymentMethod.value
                });
                if (!result.success) {
                    showToast(result.error, 'error');
                    return;
                }

                closePaymentModal();
                showToast('Recebimento registrado na data selecionada.', 'success');
                renderAdminDashboard();
                if (elements.adminReceivablesModal.classList.contains('active')) {
                    renderAdminReceivables();
                }
            });
        }
        if (elements.btnAssignLegacyPayment) {
            elements.btnAssignLegacyPayment.addEventListener('click', () => {
                if (!state.selectedPaymentReservationId) return;
                const result = assignUnattributedReservationPayment(state.selectedPaymentReservationId, {
                    valor: elements.paymentAmount.value,
                    data: elements.paymentDate.value,
                    formaPagamento: elements.paymentMethod.value
                });
                if (!result.success) {
                    showToast(result.error, 'error');
                    return;
                }

                closePaymentModal();
                showToast('Pagamento anterior associado à data selecionada.', 'success');
                renderAdminDashboard();
                if (elements.adminReceivablesModal.classList.contains('active')) {
                    renderAdminReceivables();
                }
            });
        }

        if (elements.btnAdminOpenReceivables) {
            elements.btnAdminOpenReceivables.addEventListener('click', openAdminReceivablesModal);
        }
        if (elements.btnCloseAdminReceivables) {
            elements.btnCloseAdminReceivables.addEventListener('click', closeAdminReceivablesModal);
        }
        if (elements.btnCloseAdminReceivablesFooter) {
            elements.btnCloseAdminReceivablesFooter.addEventListener('click', closeAdminReceivablesModal);
        }
        if (elements.adminReceivablesModal) {
            elements.adminReceivablesModal.addEventListener('click', (event) => {
                if (event.target === elements.adminReceivablesModal) closeAdminReceivablesModal();
            });
        }
        if (elements.adminReceivablesList) {
            elements.adminReceivablesList.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-reservation-id]');
                if (button) openPaymentModal(button.dataset.reservationId);
            });
        }
        if (elements.adminReceivablesNoteSearch) {
            elements.adminReceivablesNoteSearch.addEventListener('input', renderAdminReceivables);
        }
        if (elements.adminReceivablesDateFilter) {
            elements.adminReceivablesDateFilter.addEventListener('change', renderAdminReceivables);
        }
        if (elements.btnClearAdminReceivablesFilters) {
            elements.btnClearAdminReceivablesFilters.addEventListener('click', () => {
                elements.adminReceivablesNoteSearch.value = '';
                elements.adminReceivablesDateFilter.value = '';
                renderAdminReceivables();
            });
        }

        if (elements.btnAdminLogout) {
            elements.btnAdminLogout.addEventListener('click', async () => {
                elements.btnAdminLogout.disabled = true;
                try {
                    const response = await fetch('/api/auth/logout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: '{}'
                    });
                    if (!response.ok) throw new Error('Não foi possível encerrar a sessão.');
                    window.location.replace('login.html');
                } catch (err) {
                    elements.btnAdminLogout.disabled = false;
                    showToast(err.message, 'error');
                }
            });
        }

        // Seletor de Data
        if (elements.adminDateInput) {
            elements.adminDateInput.addEventListener('change', (e) => {
                const parsed = parseAdminDateInput(e.target.value);
                if (parsed) {
                    setSelectedDate(parsed);
                    return;
                }

                showToast('Informe uma data válida no formato DD/MM/AA.', 'error');
                elements.adminDateInput.value = formatAdminDateInput(parseDateString(state.selectedDateStr));
            });
        }

        if (elements.btnAdminPrevDay) {
            elements.btnAdminPrevDay.addEventListener('click', () => stepDay(-1));
        }

        if (elements.btnAdminNextDay) {
            elements.btnAdminNextDay.addEventListener('click', () => stepDay(1));
        }

        if (elements.btnAdminToday) {
            elements.btnAdminToday.addEventListener('click', () => setSelectedDate(new Date()));
        }

        // Campo de Busca
        if (elements.adminSearchInput) {
            elements.adminSearchInput.addEventListener('input', (e) => {
                state.searchQuery = e.target.value.trim();
                renderAdminDashboard();
            });
        }

        // Filtros Rápidos
        if (elements.adminStatusFilters) {
            elements.adminStatusFilters.addEventListener('click', (e) => {
                const btn = e.target.closest('.filter-btn');
                if (!btn || !btn.dataset.filter) return;

                elements.adminStatusFilters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                state.activeFilter = btn.dataset.filter;
                renderAdminDashboard();
            });
        }

        // Modal Voucher
        if (elements.btnCloseVoucherModal) {
            elements.btnCloseVoucherModal.addEventListener('click', closeVoucherModal);
        }
        if (elements.btnCloseVoucherBtn) {
            elements.btnCloseVoucherBtn.addEventListener('click', closeVoucherModal);
        }
        if (elements.btnPrintVoucher) {
            elements.btnPrintVoucher.addEventListener('click', () => window.print());
        }
        if (elements.btnCopyWhatsApp) {
            elements.btnCopyWhatsApp.addEventListener('click', () => {
                if (state.selectedReservation) {
                    copyVoucherWhatsApp(state.selectedReservation);
                }
            });
        }

        // Fechar modal ao clicar fora
        if (elements.voucherModal) {
            elements.voucherModal.addEventListener('click', (e) => {
                if (e.target === elements.voucherModal) closeVoucherModal();
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && elements.adminReceivablesModal.classList.contains('active')) {
                closeAdminReceivablesModal();
            }
        });

        // ======================================================================
        // Listeners da Configuração de Diárias Pré-definidas
        // ======================================================================
        if (elements.pricingTabs) {
            elements.pricingTabs.addEventListener('click', (e) => {
                const btn = e.target.closest('[data-pricing-tab]');
                if (!btn) return;
                switchPricingTab(btn.dataset.pricingTab);
            });
        }

        if (elements.btnAutoCalcDemais) {
            elements.btnAutoCalcDemais.addEventListener('click', () => handleAutoCalc('demais'));
        }

        if (elements.btnAutoCalcMaster) {
            elements.btnAutoCalcMaster.addEventListener('click', () => handleAutoCalc('master'));
        }

        if (elements.btnSavePricing) {
            elements.btnSavePricing.addEventListener('click', handleSavePricing);
        }
    }

    // ==========================================================================
    // FUNÇÕES DE CONFIGURAÇÃO DE DIÁRIAS (POR PESSOA)
    // ==========================================================================
    function switchPricingTab(tabKey) {
        if (!elements.tabDemaisQuartos || !elements.tabSuiteMaster) return;

        if (tabKey === 'demaisQuartos') {
            elements.tabDemaisQuartos.classList.add('active');
            elements.tabSuiteMaster.classList.remove('active');
            if (elements.panelDemaisQuartos) elements.panelDemaisQuartos.style.display = 'block';
            if (elements.panelSuiteMaster) elements.panelSuiteMaster.style.display = 'none';
        } else {
            elements.tabSuiteMaster.classList.add('active');
            elements.tabDemaisQuartos.classList.remove('active');
            if (elements.panelSuiteMaster) elements.panelSuiteMaster.style.display = 'block';
            if (elements.panelDemaisQuartos) elements.panelDemaisQuartos.style.display = 'none';
        }
    }

    function loadAndRenderPricing() {
        const pricing = loadPricingSettings();

        // 1. Demais Quartos
        if (elements.basePriceDemais) {
            elements.basePriceDemais.value = pricing.demaisQuartos.valorPorPessoa || 110;
        }
        for (let i = 1; i <= 5; i++) {
            if (elements.priceDemais[i]) {
                const val = (pricing.demaisQuartos.tabela && pricing.demaisQuartos.tabela[i] !== undefined)
                    ? pricing.demaisQuartos.tabela[i]
                    : (i * (pricing.demaisQuartos.valorPorPessoa || 110));
                elements.priceDemais[i].value = val;
            }
        }

        // 2. Suítes Masters (1 e 2 pessoas - Cama Casal)
        if (elements.basePriceMaster) {
            elements.basePriceMaster.value = pricing.suiteMaster.valorPorPessoa || 190;
        }
        for (let i = 1; i <= 2; i++) {
            if (elements.priceMaster[i]) {
                const val = (pricing.suiteMaster.tabela && pricing.suiteMaster.tabela[i] !== undefined)
                    ? pricing.suiteMaster.tabela[i]
                    : (i * (pricing.suiteMaster.valorPorPessoa || 190));
                elements.priceMaster[i].value = val;
            }
        }
    }

    function handleAutoCalc(type) {
        if (type === 'demais') {
            const base = Number(elements.basePriceDemais.value) || 110;
            for (let i = 1; i <= 5; i++) {
                if (elements.priceDemais[i]) {
                    elements.priceDemais[i].value = base * i;
                }
            }
            showToast(`Valores dos quartos comuns preenchidos com base em R$ ${base.toFixed(2)} por pessoa.`, 'info');
        } else if (type === 'master') {
            const base = Number(elements.basePriceMaster.value) || 190;
            for (let i = 1; i <= 2; i++) {
                if (elements.priceMaster[i]) {
                    elements.priceMaster[i].value = base * i;
                }
            }
            showToast(`Valores da Suíte Master (1 e 2 pessoas) preenchidos com base em R$ ${base.toFixed(2)} por pessoa.`, 'info');
        }
    }

    function handleSavePricing() {
        const payload = {
            demaisQuartos: {
                valorPorPessoa: Number(elements.basePriceDemais.value) || 110,
                tabela: {}
            },
            suiteMaster: {
                valorPorPessoa: Number(elements.basePriceMaster.value) || 190,
                tabela: {}
            }
        };

        for (let i = 1; i <= 5; i++) {
            if (elements.priceDemais[i]) {
                payload.demaisQuartos.tabela[i] = Number(elements.priceDemais[i].value) || (i * payload.demaisQuartos.valorPorPessoa);
            }
        }
        for (let i = 1; i <= 2; i++) {
            if (elements.priceMaster[i]) {
                payload.suiteMaster.tabela[i] = Number(elements.priceMaster[i].value) || (i * payload.suiteMaster.valorPorPessoa);
            }
        }

        const ok = savePricingSettings(payload);
        if (ok) {
            showToast('Tabela de diárias salva com sucesso! Os valores já estão ativos na recepção.', 'success');
        } else {
            showToast('Erro ao salvar as diárias.', 'error');
        }
    }

    // ==========================================================================
    // INICIALIZAÇÃO
    // ==========================================================================
    async function init() {
        try {
            const response = await fetch('/api/auth/status', { cache: 'no-store' });
            if (!response.ok) throw new Error('Não foi possível verificar a sessão.');
            const status = await response.json();
            if (!status.configured || !status.authenticated) {
                window.location.replace('login.html');
                return;
            }

            document.body.style.visibility = 'visible';
            initLiveClock();
            setSelectedDate(new Date());
            loadAndRenderPricing();
            setupEventListeners();
        } catch (err) {
            document.body.innerHTML = '<main style="max-width: 560px; margin: 12vh auto; padding: 24px; color: #fff; font: 16px Arial, sans-serif;"><h1>Acesso indisponível</h1><p>Inicie o sistema pelo arquivo Hotel das Oliveiras.exe para validar o acesso administrativo.</p><a href="login.html" style="color: #d4a373;">Ir para o login</a></main>';
            document.body.style.visibility = 'visible';
        }
    }

    // Aguardar carregamento do DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
