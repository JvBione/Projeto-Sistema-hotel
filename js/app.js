/**
 * app.js - Controlador Principal da Interface e Timeline PMS
 */

(() => {

    const {
        ROOMS,
        BLOCKS,
        ROOM_CATEGORIES,
        getRoomById,
        loadReservations,
        RESERVATION_STATUS,
        formatDateString,
        formatDateBR,
        parseDateString,
        calculateNights,
        saveOrUpdateReservation,
        deleteReservationById,
        updateReservationStatus,
        getReceptionKPIs,
        calculateRoomDailyRate,
        loadPricingSettings,
        recordReservationPayment,
        assignUnattributedReservationPayment
    } = window.HotelPMS;

    // Estado global da aplicação
    const state = {
        currentYear: new Date().getFullYear(),
        currentMonth: new Date().getMonth(), // 0-indexed (0 = Jan, 8 = Setembro)
        filterBlock: 'all',
        filterType: 'all',
        searchQuery: '',
        selectedReservation: null,
        selectedPaymentReservationId: null
    };

    const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const MONTH_NAMES = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const DAY_COL_WIDTH = 50; // pixels por dia na grade

    // Elementos DOM
    const elements = {
        headerDate: document.getElementById('headerCurrentDate'),
        headerTime: document.getElementById('headerCurrentTime'),
        selectMonth: document.getElementById('selectMonth'),
        selectYear: document.getElementById('selectYear'),
        btnPrevMonth: document.getElementById('btnPrevMonth'),
        btnNextMonth: document.getElementById('btnNextMonth'),
        btnToday: document.getElementById('btnToday'),
        inputSearch: document.getElementById('inputSearch'),
        blockFilters: document.getElementById('blockFilters'),
        typeFilters: document.getElementById('typeFilters'),
        timelineTable: document.getElementById('timelineTable'),
        timelineScrollContainer: document.getElementById('timelineScrollContainer'),

        // KPIs
        kpiOccupancyRate: document.getElementById('kpiOccupancyRate'),
        kpiOccupancySubtext: document.getElementById('kpiOccupancySubtext'),
        kpiAvailableRooms: document.getElementById('kpiAvailableRooms'),
        kpiCheckInsToday: document.getElementById('kpiCheckInsToday'),
        kpiCheckOutsToday: document.getElementById('kpiCheckOutsToday'),
        kpiMonthlyRevenue: document.getElementById('kpiMonthlyRevenue'),
        kpiRevenueMonthName: document.getElementById('kpiRevenueMonthName'),

        // Modais
        reservationModal: document.getElementById('reservationModal'),
        reservationForm: document.getElementById('reservationForm'),
        modalReservationTitle: document.getElementById('modalReservationTitle'),
        badgeModalNota: document.getElementById('badgeModalNota'),
        resNotaInfoBanner: document.getElementById('resNotaInfoBanner'),
        displayResNumeroNota: document.getElementById('displayResNumeroNota'),
        btnCloseResModal: document.getElementById('btnCloseResModal'),
        btnCancelModal: document.getElementById('btnCancelModal'),
        btnDeleteReservation: document.getElementById('btnDeleteReservation'),
        btnGenerateVoucher: document.getElementById('btnGenerateVoucher'),
        btnQuickCheckIn: document.getElementById('btnQuickCheckIn'),
        btnQuickCheckOut: document.getElementById('btnQuickCheckOut'),

        // Campos da Reserva
        resId: document.getElementById('resId'),
        resQuarto: document.getElementById('resQuarto'),
        resStatus: document.getElementById('resStatus'),
        resDiaria: document.getElementById('resDiaria'),
        displayDiariaValor: document.getElementById('displayDiariaValor'),
        displayDiariaInfo: document.getElementById('displayDiariaInfo'),
        resCheckIn: document.getElementById('resCheckIn'),
        resCheckOut: document.getElementById('resCheckOut'),
        resNightsDisplay: document.getElementById('resNightsDisplay'),
        resNome: document.getElementById('resNome'),
        resTelefone: document.getElementById('resTelefone'),
        resCpf: document.getElementById('resCpf'),
        resCidade: document.getElementById('resCidade'),
        resAdultos: document.getElementById('resAdultos'),
        resCriancas: document.getElementById('resCriancas'),
        resValorTotal: document.getElementById('resValorTotal'),
        resValorPago: document.getElementById('resValorPago'),
        resValorPagoHint: document.getElementById('resValorPagoHint'),
        resFormaPagamento: document.getElementById('resFormaPagamento'),
        resObs: document.getElementById('resObs'),
        summaryTotal: document.getElementById('summaryTotal'),
        summaryPaid: document.getElementById('summaryPaid'),
        summaryDue: document.getElementById('summaryDue'),

        // Modal Manutenção / Bloqueio
        blockModal: document.getElementById('blockModal'),
        blockModalTitle: document.getElementById('blockModalTitle'),
        blockForm: document.getElementById('blockForm'),
        blockId: document.getElementById('blockId'),
        blockQuarto: document.getElementById('blockQuarto'),
        blockCategoria: document.getElementById('blockCategoria'),
        blockMotivo: document.getElementById('blockMotivo'),
        blockCheckIn: document.getElementById('blockCheckIn'),
        blockCheckOut: document.getElementById('blockCheckOut'),
        blockTecnico: document.getElementById('blockTecnico'),
        blockActiveBanner: document.getElementById('blockActiveBanner'),
        btnSubmitBlock: document.getElementById('btnSubmitBlock'),
        btnDeleteBlock: document.getElementById('btnDeleteBlock'),
        btnNewBlock: document.getElementById('btnNewBlock'),
        btnCloseBlockModal: document.getElementById('btnCloseBlockModal'),
        btnCancelBlockModal: document.getElementById('btnCancelBlockModal'),
        tabBtnNewBlock: document.getElementById('tabBtnNewBlock'),
        tabBtnActiveBlocks: document.getElementById('tabBtnActiveBlocks'),
        blockFormPanel: document.getElementById('blockFormPanel'),
        blockActiveListPanel: document.getElementById('blockActiveListPanel'),
        activeBlocksListContainer: document.getElementById('activeBlocksListContainer'),
        countActiveBlocksBadge: document.getElementById('countActiveBlocksBadge'),
        headerMaintenanceBadge: document.getElementById('headerMaintenanceBadge'),
        btnCloseActiveBlocksPanel: document.getElementById('btnCloseActiveBlocksPanel'),

        // Modal Voucher
        voucherModal: document.getElementById('voucherModal'),
        voucherContent: document.getElementById('voucherContent'),
        btnCloseVoucherModal: document.getElementById('btnCloseVoucherModal'),
        btnCloseVoucherBtn: document.getElementById('btnCloseVoucherBtn'),
        btnPrintVoucher: document.getElementById('btnPrintVoucher'),
        btnCopyWhatsApp: document.getElementById('btnCopyWhatsApp'),

        // Tooltip & Toast
        resTooltip: document.getElementById('resTooltip'),
        toastContainer: document.getElementById('toastContainer'),
        btnNewReservation: document.getElementById('btnNewReservation'),
        btnOpenReceivables: document.getElementById('btnOpenReceivables'),
        headerReceivablesBadge: document.getElementById('headerReceivablesBadge'),
        receivablesModal: document.getElementById('receivablesModal'),
        receivablesList: document.getElementById('receivablesList'),
        receivablesNoteSearch: document.getElementById('receivablesNoteSearch'),
        receivablesDateFilter: document.getElementById('receivablesDateFilter'),
        receivablesResultCount: document.getElementById('receivablesResultCount'),
        btnClearReceivablesFilters: document.getElementById('btnClearReceivablesFilters'),
        btnCloseReceivables: document.getElementById('btnCloseReceivables'),
        btnCloseReceivablesFooter: document.getElementById('btnCloseReceivablesFooter'),
        receptionPaymentModal: document.getElementById('receptionPaymentModal'),
        receptionPaymentForm: document.getElementById('receptionPaymentForm'),
        receptionPaymentReservation: document.getElementById('receptionPaymentReservation'),
        receptionPaymentDate: document.getElementById('receptionPaymentDate'),
        receptionPaymentAmount: document.getElementById('receptionPaymentAmount'),
        receptionPaymentBalance: document.getElementById('receptionPaymentBalance'),
        receptionPaymentLegacyBalance: document.getElementById('receptionPaymentLegacyBalance'),
        receptionPaymentMethod: document.getElementById('receptionPaymentMethod'),
        receptionPaymentHistory: document.getElementById('receptionPaymentHistory'),
        btnCloseReceptionPayment: document.getElementById('btnCloseReceptionPayment'),
        btnCancelReceptionPayment: document.getElementById('btnCancelReceptionPayment'),
        btnAssignReceptionLegacyPayment: document.getElementById('btnAssignReceptionLegacyPayment')
    };

    // ==========================================================================
    // INICIALIZAÇÃO DA APLICAÇÃO (Executa imediatamente ou no DOMContentLoaded)
    // ==========================================================================
    function initApp() {
        initClock();
        populateYearSelect();
        populateRoomDropdowns();
        setupEventListeners();
        updateDashboardKPIs();
        renderRoomStatusSquares();
        renderTimeline();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // Relógio ao vivo e data em tempo real em português
    function initClock() {
        function tick() {
            const now = new Date();
            const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
            let dateFormatted = now.toLocaleDateString('pt-BR', dateOptions);
            if (dateFormatted) {
                dateFormatted = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
            }

            const timeFormatted = now.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });

            const dateEl = (elements && elements.headerDate) || document.getElementById('headerCurrentDate');
            const timeEl = (elements && elements.headerTime) || document.getElementById('headerCurrentTime');

            if (dateEl) dateEl.textContent = dateFormatted;
            if (timeEl) timeEl.textContent = timeFormatted;
        }
        tick();
        setInterval(tick, 1000);
    }

    // Preenche opções de ano (2 anos passados a 5 anos futuros)
    function populateYearSelect() {
        const currentY = new Date().getFullYear();
        elements.selectYear.innerHTML = '';
        for (let y = currentY - 2; y <= currentY + 5; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === state.currentYear) opt.selected = true;
            elements.selectYear.appendChild(opt);
        }
        elements.selectMonth.value = state.currentMonth;
    }

    // Preenche selects de quarto nos formulários
    function populateRoomDropdowns() {
        elements.resQuarto.innerHTML = '';
        elements.blockQuarto.innerHTML = '';

        BLOCKS.forEach(bloco => {
            const optGroup1 = document.createElement('optgroup');
            optGroup1.label = `--- ${bloco.nome} ---`;
            const optGroup2 = document.createElement('optgroup');
            optGroup2.label = `--- ${bloco.nome} ---`;

            const roomsInBlock = ROOMS.filter(r => r.blocoId === bloco.id);
            roomsInBlock.forEach(r => {
                const opt1 = document.createElement('option');
                opt1.value = r.id;
                opt1.textContent = `Quarto ${r.numero} - ${r.categoria.nome}`;
                optGroup1.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = r.id;
                opt2.textContent = `Quarto ${r.numero} - ${r.categoria.nome}`;
                optGroup2.appendChild(opt2);
            });

            elements.resQuarto.appendChild(optGroup1);
            elements.blockQuarto.appendChild(optGroup2);
        });
    }

    // ==========================================================================
    // RENDERIZAÇÃO DO MAPA DE OCUPAÇÃO (TIMELINE GRID)
    // ==========================================================================
    function renderTimeline() {
        const year = state.currentYear;
        const month = state.currentMonth;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const todayStr = formatDateString(today);
        const isCurrentMonth = (today.getFullYear() === year && today.getMonth() === month);
        const todayDay = isCurrentMonth ? today.getDate() : -1;

        // Filtra quartos de acordo com bloco, tipo e busca
        let filteredRooms = ROOMS.filter(r => {
            if (state.filterBlock !== 'all' && r.blocoId !== state.filterBlock) return false;
            if (state.filterType !== 'all' && r.tipo !== state.filterType) return false;
            if (state.searchQuery) {
                const q = state.searchQuery.toLowerCase();
                return r.numero.includes(q) || r.blocoNome.toLowerCase().includes(q) || r.categoria.nome.toLowerCase().includes(q);
            }
            return true;
        });

        const reservations = loadReservations();

        // Monta a estrutura da tabela
        let html = '';

        let blockLabel = `Acomodações (${filteredRooms.length})`;
        if (state.filterBlock === 'bloco-1') blockLabel = `Bloco 1 - Térreo (${filteredRooms.length})`;
        else if (state.filterBlock === 'bloco-2') blockLabel = `Bloco 2 - 1º Andar (${filteredRooms.length})`;
        else if (state.filterBlock === 'bloco-3') blockLabel = `Bloco 3 (${filteredRooms.length})`;
        else if (state.filterBlock === 'bloco-4') blockLabel = `Bloco 4 (${filteredRooms.length})`;

        // 1. Linha de Cabeçalho Sticky (Top)
        html += `<div class="timeline-header-row">`;
        html += `  <div class="timeline-corner-cell">
                 <span style="font-weight: 800; color: #fff;">${blockLabel}</span>
                 <span>${MONTH_NAMES[month].slice(0, 3)}/${year}</span>
               </div>`;
        html += `  <div class="timeline-days-header">`;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const weekdayIdx = dateObj.getDay();
            const weekdayName = DAY_NAMES[weekdayIdx];
            const isWeekend = (weekdayIdx === 0 || weekdayIdx === 6);
            const isToday = (day === todayDay);

            html += `
            <div class="timeline-day-col-header ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}" 
                 style="width: ${DAY_COL_WIDTH}px; min-width: ${DAY_COL_WIDTH}px;">
                <span class="day-header-number">${day}</span>
                <span class="day-header-weekday">${weekdayName}</span>
            </div>
        `;
        }
        html += `  </div>`;
        html += `</div>`;

        // 2. Linhas agrupadas por Bloco
        const activeBlocks = BLOCKS.filter(b => {
            if (state.filterBlock !== 'all') return b.id === state.filterBlock;
            return filteredRooms.some(r => r.blocoId === b.id);
        });

        activeBlocks.forEach(bloco => {
            const blockRooms = filteredRooms.filter(r => r.blocoId === bloco.id);
            if (blockRooms.length === 0) return;

            // Linha Divisória de Bloco
            html += `
            <div class="timeline-block-divider-row">
                <div class="timeline-block-title-cell">
                    <h4>🏢 ${bloco.nome}</h4>
                    <span class="block-count-badge">${blockRooms.length} qtos</span>
                </div>
                <div style="flex: 1; height: 32px; background: rgba(0,0,0,0.3);"></div>
            </div>
        `;

            // Linhas de cada quarto do bloco
            blockRooms.forEach(room => {
                html += `<div class="timeline-room-row" data-room-id="${room.id}">`;

                // Célula da esquerda (Nome do Quarto)
                const isMaster = room.tipo === 'suite_master';

                // Verifica se há reserva ativa hoje para exibir o valor da diária proposto apenas quando reservado
                const activeResToday = reservations.find(res => {
                    if (String(res.quartoId) !== String(room.id)) return false;
                    if (res.status === 'cancelada') return false;
                    return todayStr >= res.checkIn && todayStr < res.checkOut;
                });
                const isReservedToday = !!activeResToday && activeResToday.status !== 'bloqueio';
                const priceTagHtml = isReservedToday
                    ? `<div class="room-price-tag">R$ ${Number(activeResToday.diaria || 0).toFixed(2)}</div>`
                    : `<div class="room-price-tag"></div>`;

                html += `
                <div class="timeline-room-cell" onclick="window.handleRoomClick('${room.id}')" title="Clique para detalhes ou nova reserva">
                    <div class="room-cell-info">
                        <div class="room-number-box ${isMaster ? 'master' : ''}">
                            <span>${room.numero}</span>
                        </div>
                        <div class="room-meta">
                            <span class="room-badge ${room.categoria.badgeClass}">${room.categoria.nome}</span>
                            <span class="room-sub-detail">${room.camas}</span>
                        </div>
                    </div>
                    ${priceTagHtml}
                </div>
            `;

                // Células de dias do quarto
                html += `
                <div class="timeline-room-days" style="width: ${daysInMonth * DAY_COL_WIDTH}px;">
            `;

                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(year, month, day);
                    const isWeekend = (dateObj.getDay() === 0 || dateObj.getDay() === 6);
                    const isToday = (day === todayDay);
                    const dayDateStr = formatDateString(dateObj);

                    html += `
                    <div class="timeline-day-cell ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}" 
                         data-room-id="${room.id}" 
                         data-date="${dayDateStr}"
                         onclick="window.handleDayCellClick('${room.id}', '${dayDateStr}')"
                         title="Criar reserva em ${formatDateBR(dayDateStr)}">
                    </div>
                `;
                }

                // Renderizar Barras de Reservas deste quarto que cruzam este mês
                const roomReservations = reservations.filter(res => {
                    if (String(res.quartoId) !== String(room.id)) return false;
                    if (res.status === 'cancelada') return false;

                    // Verifica se cruza o mês atual
                    const startOfMonthStr = formatDateString(new Date(year, month, 1));
                    const endOfMonthStr = formatDateString(new Date(year, month + 1, 0));

                    return res.checkIn <= endOfMonthStr && res.checkOut >= startOfMonthStr;
                });

                roomReservations.forEach(res => {
                    const checkInDate = parseDateString(res.checkIn);
                    const checkOutDate = parseDateString(res.checkOut);

                    // Determina início e fim visíveis no mês
                    let visibleStartDay = 1;
                    if (checkInDate.getFullYear() === year && checkInDate.getMonth() === month) {
                        visibleStartDay = checkInDate.getDate();
                    } else if (checkInDate > new Date(year, month, 1)) {
                        visibleStartDay = checkInDate.getDate();
                    }

                    let visibleEndDay = daysInMonth + 1;
                    if (checkOutDate.getFullYear() === year && checkOutDate.getMonth() === month) {
                        visibleEndDay = checkOutDate.getDate();
                    } else if (checkOutDate < new Date(year, month + 1, 1)) {
                        visibleEndDay = checkOutDate.getDate();
                    }

                    // Cálculo da largura e deslocamento em pixels
                    const leftPos = (visibleStartDay - 1) * DAY_COL_WIDTH + 4;
                    const durationDays = Math.max(0.5, visibleEndDay - visibleStartDay);
                    const barWidth = Math.max(30, (durationDays * DAY_COL_WIDTH) - 8);

                    const statusObj = RESERVATION_STATUS[res.status.toUpperCase()] || RESERVATION_STATUS.CONFIRMADA;
                    const isBlocked = res.status === 'bloqueio';

                    html += `
                    <div class="reservation-bar ${res.status}" 
                         style="left: ${leftPos}px; width: ${barWidth}px;"
                         data-res-id="${res.id}"
                         onclick="window.handleReservationClick(event, '${res.id}')"
                         onmouseenter="window.handleReservationHover(event, '${res.id}')"
                         onmouseleave="window.handleReservationLeave()">
                        <span class="res-guest-name">
                            ${statusObj.icon} ${isBlocked ? 'MANUTENÇÃO' : res.hospedeNome}
                        </span>
                        ${!isBlocked ? `<span class="res-night-badge">${res.noites || calculateNights(res.checkIn, res.checkOut)}n</span>` : ''}
                    </div>
                `;
                });

                html += `  </div>`;
                html += `</div>`;
            });
        });

        elements.timelineTable.innerHTML = html;

        // Se estiver no mês atual e tiver dia de hoje, rolar suavemente para o dia de hoje
        if (isCurrentMonth && todayDay > 3) {
            setTimeout(() => {
                const scrollOffset = (todayDay - 3) * DAY_COL_WIDTH;
                elements.timelineScrollContainer.scrollLeft = scrollOffset;
            }, 100);
        }
    }

    // ==========================================================================
    // ATUALIZAÇÃO DOS INDICADORES (KPIS)
    // ==========================================================================
    function updateDashboardKPIs() {
        const kpis = getReceptionKPIs();
        elements.kpiOccupancyRate.textContent = `${kpis.taxaOcupacao}%`;
        elements.kpiOccupancySubtext.textContent = `${kpis.ocupadosHoje} de ${kpis.totalQuartos} quartos`;
        elements.kpiAvailableRooms.textContent = kpis.quartosLivresHoje;
        elements.kpiCheckInsToday.textContent = kpis.checkInsHoje;
        elements.kpiCheckOutsToday.textContent = kpis.checkOutsHoje;
        if (elements.kpiMonthlyRevenue) {
            elements.kpiMonthlyRevenue.textContent = `R$ ${kpis.faturamentoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        }
        if (elements.kpiRevenueMonthName) {
            elements.kpiRevenueMonthName.textContent = `Faturamento em ${MONTH_NAMES[state.currentMonth]}`;
        }
        updateReceivablesBadge();
        updateMaintenanceBadges();
    }

    function getReservationBalance(reservation) {
        const balance = Number(reservation.saldoPendente !== undefined
            ? reservation.saldoPendente
            : (Number(reservation.valorTotal) - Number(reservation.valorPago)));
        return Math.max(0, Number.isFinite(balance) ? balance : 0);
    }

    function getUnattributedPaidAmount(reservation) {
        const payments = Array.isArray(reservation.pagamentos) ? reservation.pagamentos : [];
        const recordedTotal = payments.reduce((total, payment) => {
            const amount = Number(payment.valor);
            return total + (Number.isFinite(amount) && amount > 0 ? amount : 0);
        }, 0);
        return Math.max(0, Math.round(((Number(reservation.valorPago) || 0) - recordedTotal) * 100) / 100);
    }

    function formatReceptionCurrency(value) {
        return Number(value || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    function getOpenReceivables() {
        return loadReservations()
            .filter(reservation =>
                reservation.status !== 'cancelada' &&
                reservation.status !== 'bloqueio' &&
                getReservationBalance(reservation) > 0
            )
            .sort((a, b) => String(a.checkOut).localeCompare(String(b.checkOut)));
    }

    function updateReceivablesBadge() {
        if (!elements.headerReceivablesBadge) return;
        const count = getOpenReceivables().length;
        elements.headerReceivablesBadge.textContent = count;
        elements.headerReceivablesBadge.style.display = count > 0 ? 'inline-block' : 'none';
    }

    function renderReceivablesList() {
        const container = elements.receivablesList;
        if (!container) return;

        const allReservations = getOpenReceivables();
        const noteQuery = elements.receivablesNoteSearch.value.trim().toLocaleLowerCase('pt-BR');
        const selectedDate = elements.receivablesDateFilter.value;
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

        container.replaceChildren();
        elements.receivablesResultCount.textContent =
            `Mostrando ${reservations.length} de ${allReservations.length} nota(s) com saldo em aberto.`;
        if (reservations.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'text-align: center; padding: 36px 16px; color: var(--text-muted);';
            empty.textContent = allReservations.length === 0
                ? 'Todas as notas estão quitadas. Não há saldo pendente.'
                : 'Nenhuma nota em aberto corresponde aos filtros selecionados.';
            container.appendChild(empty);
            return;
        }

        reservations.forEach(reservation => {
            const room = getRoomById(reservation.quartoId);
            const balance = getReservationBalance(reservation);
            const legacyPaid = getUnattributedPaidAmount(reservation);
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

            const financial = document.createElement('span');
            financial.style.cssText = 'font-size: 0.82rem; color: var(--text-secondary);';
            financial.textContent = `Total ${formatReceptionCurrency(reservation.valorTotal)} • Pago ${formatReceptionCurrency(reservation.valorPago)}`;
            details.appendChild(financial);

            if (legacyPaid > 0) {
                const legacy = document.createElement('span');
                legacy.style.cssText = 'font-size: 0.76rem; color: var(--text-muted);';
                legacy.textContent = `${formatReceptionCurrency(legacyPaid)} pagos anteriormente sem data registrada`;
                details.appendChild(legacy);
            }

            const actions = document.createElement('div');
            actions.style.cssText = 'display: flex; flex-direction: column; align-items: flex-end; gap: 8px;';
            const amount = document.createElement('strong');
            amount.style.cssText = 'color: #fbbf24; font-size: 1.05rem;';
            amount.textContent = `Saldo: ${formatReceptionCurrency(balance)}`;
            actions.appendChild(amount);

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn btn-primary btn-sm';
            button.dataset.reservationId = reservation.id;
            button.textContent = '💳 Registrar pagamento';
            actions.appendChild(button);

            card.append(details, actions);
            container.appendChild(card);
        });
    }

    function openReceivablesModal() {
        renderReceivablesList();
        elements.receivablesModal.classList.add('active');
    }

    function closeReceivablesModal() {
        elements.receivablesModal.classList.remove('active');
    }

    function openReceptionPaymentModal(reservationId) {
        const reservation = loadReservations().find(item => item.id === reservationId);
        if (!reservation || getReservationBalance(reservation) <= 0) {
            showToast('A nota não possui saldo pendente.', 'info');
            renderReceivablesList();
            updateReceivablesBadge();
            return;
        }

        state.selectedPaymentReservationId = reservationId;
        elements.receptionPaymentForm.reset();
        elements.receptionPaymentDate.value = formatDateString(new Date());
        elements.receptionPaymentAmount.value = '';
        elements.receptionPaymentAmount.max = getReservationBalance(reservation).toFixed(2);
        elements.receptionPaymentBalance.textContent =
            `Saldo pendente: ${formatReceptionCurrency(getReservationBalance(reservation))}`;
        elements.receptionPaymentReservation.textContent =
            `${reservation.numeroNota || 'Reserva'} • ${reservation.hospedeNome || 'Hóspede'} • Quarto ${reservation.quartoId}`;

        const legacyPaid = getUnattributedPaidAmount(reservation);
        elements.receptionPaymentLegacyBalance.textContent = legacyPaid > 0
            ? `Pagamento anterior sem data: ${formatReceptionCurrency(legacyPaid)}. Você pode associá-lo à data correta.`
            : '';
        elements.btnAssignReceptionLegacyPayment.hidden = legacyPaid <= 0;
        elements.btnAssignReceptionLegacyPayment.disabled = legacyPaid <= 0;
        elements.receptionPaymentHistory.replaceChildren();

        const payments = Array.isArray(reservation.pagamentos) ? reservation.pagamentos : [];
        if (payments.length > 0) {
            const title = document.createElement('strong');
            title.textContent = 'Pagamentos registrados';
            elements.receptionPaymentHistory.appendChild(title);
            const list = document.createElement('ul');
            list.style.cssText = 'padding-left: 20px; margin: 6px 0 0;';
            payments.slice().sort((a, b) => String(b.data).localeCompare(String(a.data))).forEach(payment => {
                const item = document.createElement('li');
                item.textContent = `${formatDateBR(payment.data)} • ${formatReceptionCurrency(payment.valor)} • ${payment.formaPagamento || 'Forma não informada'}`;
                list.appendChild(item);
            });
            elements.receptionPaymentHistory.appendChild(list);
        }

        elements.receptionPaymentModal.classList.add('active');
    }

    function closeReceptionPaymentModal() {
        elements.receptionPaymentModal.classList.remove('active');
        state.selectedPaymentReservationId = null;
    }

    // ==========================================================================
    // RENDERIZAÇÃO DOS QUADRADOS DE OCUPAÇÃO HOJE (VERDES E VERMELHOS)
    // ==========================================================================
    function renderRoomStatusSquares() {
        const gridContainer = document.getElementById('roomsSquaresGrid');
        const titleEl = document.getElementById('roomStatusGridTitle');
        const dateBadgeEl = document.getElementById('roomStatusDateBadge');
        const countAvailEl = document.getElementById('countAvailableToday');
        const countOccEl = document.getElementById('countOccupiedToday');

        if (!gridContainer) return;

        const today = new Date();
        const todayStr = formatDateString(today);
        if (dateBadgeEl) {
            dateBadgeEl.textContent = `Hoje (${today.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`;
        }

        // Filtrar quartos pelo bloco selecionado
        let roomsToDisplay = ROOMS;
        if (state.filterBlock !== 'all') {
            roomsToDisplay = ROOMS.filter(r => r.blocoId === state.filterBlock);
        }
        if (state.filterType !== 'all') {
            roomsToDisplay = roomsToDisplay.filter(r => r.tipo === state.filterType);
        }

        const blockTitles = {
            'all': `🏨 Ocupação Hoje • Todos os Blocos (${roomsToDisplay.length} quartos)`,
            'bloco-1': `🌱 Ocupação Hoje • Bloco 1 - Térreo (${roomsToDisplay.length} quartos: 101 ao 110)`,
            'bloco-2': `🏢 Ocupação Hoje • Bloco 2 - 1º Andar (${roomsToDisplay.length} quartos: 201 ao 210)`,
            'bloco-3': `🏡 Ocupação Hoje • Bloco 3 (${roomsToDisplay.length} quartos: 111 ao 118)`,
            'bloco-4': `⭐ Ocupação Hoje • Bloco 4 (${roomsToDisplay.length} quartos: 211 ao 214)`
        };

        if (titleEl) {
            titleEl.textContent = blockTitles[state.filterBlock] || `Ocupação Hoje (${roomsToDisplay.length} quartos)`;
        }

        const reservations = loadReservations();
        let countAvailable = 0;
        let countOccupied = 0;
        let html = '';

        roomsToDisplay.forEach(room => {
            // Encontra se há reserva ativa hoje neste quarto
            const activeRes = reservations.find(res => {
                if (String(res.quartoId) !== String(room.id)) return false;
                if (res.status === 'cancelada') return false;
                return todayStr >= res.checkIn && todayStr < res.checkOut;
            });

            const isOccupied = !!activeRes;
            if (isOccupied) {
                countOccupied++;
            } else {
                countAvailable++;
            }

            const isMaster = room.tipo === 'suite_master';
            const isBlockStatus = activeRes && activeRes.status === 'bloqueio';
            const categoryTag = isMaster ? '⭐ Master' : (room.tipo === 'com_janela' ? '🪟 C/ Janela' : (room.tipo === 'sem_janela' ? '🚪 S/ Janela' : room.categoria.nome));

            let subDetailText = '';
            if (isOccupied) {
                if (isBlockStatus) {
                    subDetailText = '🔧 ' + (activeRes.observacoes || 'Interditado');
                } else {
                    const diariaVal = Number(activeRes.diaria || 0);
                    subDetailText = `R$ ${diariaVal.toFixed(2)}/diária`;
                }
            }

            const diariaTooltip = (!isBlockStatus && activeRes) ? ` • Diária: R$ ${Number(activeRes.diaria || 0).toFixed(2)}` : '';

            html += `
            <div class="room-square-card ${isOccupied ? 'occupied' : 'available'}" 
                 onclick="${isOccupied ? `window.handleReservationClick(event, '${activeRes.id}')` : `window.handleDayCellClick('${room.id}', '${todayStr}')`}"
                 title="${isOccupied ? `Quarto ${room.numero} INDISPONÍVEL hoje (${isBlockStatus ? 'Manutenção' : `${activeRes.hospedeNome}${diariaTooltip}`}). Clique para detalhes.` : `Quarto ${room.numero} DISPONÍVEL hoje! Clique para reservar hoje.`}">
                
                <div class="room-square-number">${room.numero}</div>
                <span class="room-square-category ${room.categoria.badgeClass}">
                    ${categoryTag}
                </span>

                <div class="room-square-status-text">
                    ${isOccupied ? (isBlockStatus ? '🔧 Bloqueado' : '🔴 Ocupado') : '🟢 Disponível'}
                </div>

                <div class="room-square-sub" title="${subDetailText}">
                    ${subDetailText || '&nbsp;'}
                </div>
            </div>
        `;
        });

        gridContainer.innerHTML = html;
        if (countAvailEl) countAvailEl.textContent = countAvailable;
        if (countOccEl) countOccEl.textContent = countOccupied;
    }

    // ==========================================================================
    // MANIPULADORES DE EVENTOS DA TIMELINE & CLIQUE
    // ==========================================================================
    window.handleDayCellClick = function (roomId, dateStr) {
        const nextDay = new Date(parseDateString(dateStr));
        nextDay.setDate(nextDay.getDate() + 2); // 2 diárias por padrão ao clicar
        const checkOutStr = formatDateString(nextDay);

        openReservationModal({
            quartoId: roomId,
            checkIn: dateStr,
            checkOut: checkOutStr,
            status: 'confirmada'
        });
    };

    window.handleRoomClick = function (roomId) {
        const todayStr = formatDateString(new Date());
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatDateString(tomorrow);

        openReservationModal({
            quartoId: roomId,
            checkIn: todayStr,
            checkOut: tomorrowStr,
            status: 'confirmada'
        });
    };

    window.handleReservationClick = function (event, resId) {
        event.stopPropagation();
        const reservations = loadReservations();
        const res = reservations.find(r => r.id === resId);
        if (!res) return;

        if (res.status === 'bloqueio') {
            openBlockModal(res);
        } else {
            openReservationModal(res);
        }
    };

    window.handleReservationHover = function (event, resId) {
        const reservations = loadReservations();
        const res = reservations.find(r => r.id === resId);
        if (!res) return;

        const room = getRoomById(res.quartoId);
        const statusObj = RESERVATION_STATUS[res.status.toUpperCase()] || RESERVATION_STATUS.CONFIRMADA;
        const isBlocked = res.status === 'bloqueio';

        let content = `
        <div class="tooltip-title">
            <span>${isBlocked ? '🔧 BLOQUEIO' : res.hospedeNome}</span>
            <div style="display: flex; gap: 4px; align-items: center;">
                ${res.numeroNota ? `<span style="background: rgba(212, 163, 115, 0.25); color: #d4a373; border: 1px solid rgba(212, 163, 115, 0.4); padding: 1px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 800;">${res.numeroNota}</span>` : ''}
                <span style="font-size: 0.7rem; color: #94a3b8;">${statusObj.label}</span>
            </div>
        </div>
        <div class="tooltip-dates">
            📅 ${formatDateBR(res.checkIn)} a ${formatDateBR(res.checkOut)} (${res.noites || calculateNights(res.checkIn, res.checkOut)} noites)
        </div>
        <div style="font-size: 0.75rem; color: #cbd5e1;">
            🏨 Quarto ${room ? room.numero : res.quartoId} • ${room ? room.categoria.nome : ''}
        </div>
    `;

        if (!isBlocked) {
            content += `
            <div style="font-size: 0.75rem; color: #94a3b8;">
                📞 ${res.hospedeTelefone || '-'} • 👥 ${res.adultos || 2} adultos
            </div>
            <div class="tooltip-financial">
                <span>Diária: <strong>R$ ${Number(res.diaria || 0).toFixed(2)}</strong></span>
                <span>Total: <strong>R$ ${Number(res.valorTotal).toFixed(2)}</strong></span>
                <span>Saldo: <strong style="color: ${res.saldoPendente > 0 ? '#fbbf24' : '#34d399'};">R$ ${Number(res.saldoPendente).toFixed(2)}</strong></span>
            </div>
        `;
        }

        elements.resTooltip.innerHTML = content;
        elements.resTooltip.classList.add('active');

        const rect = event.target.getBoundingClientRect();
        elements.resTooltip.style.left = `${Math.min(window.innerWidth - 330, Math.max(10, rect.left))}px`;
        elements.resTooltip.style.top = `${rect.bottom + 8}px`;
    };

    window.handleReservationLeave = function () {
        elements.resTooltip.classList.remove('active');
    };

    // ==========================================================================
    // MODAL DE RESERVA (CRIAR E EDITAR)
    // ==========================================================================
    function openReservationModal(res = {}) {
        state.selectedReservation = res.id ? res : null;

        if (res.id) {
            elements.modalReservationTitle.textContent = `✏️ Editar Reserva #${res.id.slice(-4)}`;
            if (res.numeroNota) {
                elements.badgeModalNota.textContent = res.numeroNota;
                elements.badgeModalNota.style.display = 'inline-block';
                if (elements.resNotaInfoBanner) {
                    elements.resNotaInfoBanner.style.display = 'flex';
                    elements.displayResNumeroNota.textContent = res.numeroNota;
                }
            } else {
                elements.badgeModalNota.style.display = 'none';
                if (elements.resNotaInfoBanner) elements.resNotaInfoBanner.style.display = 'none';
            }
        } else {
            elements.modalReservationTitle.textContent = '➕ Nova Reserva';
            elements.badgeModalNota.style.display = 'none';
            if (elements.resNotaInfoBanner) elements.resNotaInfoBanner.style.display = 'none';
        }

        elements.resId.value = res.id || '';
        elements.resQuarto.value = res.quartoId || '101';
        elements.resStatus.value = res.status || 'confirmada';

        const room = getRoomById(elements.resQuarto.value);
        const adultos = res.adultos || (room ? room.capacidade : 2);
        const criancas = res.criancas || 0;
        const autoDiaria = calculateRoomDailyRate(elements.resQuarto.value, adultos, criancas);
        elements.resDiaria.value = (res.diaria !== undefined && res.diaria !== null && res.diaria !== '' && res.id) ? res.diaria : autoDiaria;

        const todayStr = formatDateString(new Date());
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = formatDateString(tomorrow);

        elements.resCheckIn.value = res.checkIn || todayStr;
        elements.resCheckOut.value = res.checkOut || tomorrowStr;

        elements.resNome.value = res.hospedeNome || '';
        elements.resTelefone.value = res.hospedeTelefone || '';
        elements.resCpf.value = res.hospedeCpf || '';
        elements.resCidade.value = res.hospedeCidade || '';
        elements.resAdultos.value = res.adultos || (room ? room.capacidade : 2);
        elements.resCriancas.value = res.criancas || 0;
        elements.resValorPago.value = res.valorPago || 0;
        elements.resValorPago.readOnly = !!res.id;
        if (elements.resValorPagoHint) {
            elements.resValorPagoHint.textContent = res.id
                ? 'Para registrar outro pagamento, use Administração na data em que ele for recebido.'
                : 'Para novas reservas, esse valor será registrado como recebido hoje.';
        }
        elements.resValorTotal.value = (res.valorTotal !== undefined && res.valorTotal !== null && res.valorTotal !== '') ? res.valorTotal : '';
        elements.resFormaPagamento.value = res.formaPagamento || 'PIX';
        elements.resObs.value = res.observacoes || '';

        // Ações contextuais de acordo com o status
        if (res.id) {
            elements.btnDeleteReservation.style.display = 'inline-flex';
            elements.btnGenerateVoucher.style.display = 'inline-flex';

            if (res.status === 'confirmada' || res.status === 'pendente') {
                elements.btnQuickCheckIn.style.display = 'inline-flex';
                elements.btnQuickCheckOut.style.display = 'none';
            } else if (res.status === 'hospedado') {
                elements.btnQuickCheckIn.style.display = 'none';
                elements.btnQuickCheckOut.style.display = 'inline-flex';
            } else {
                elements.btnQuickCheckIn.style.display = 'none';
                elements.btnQuickCheckOut.style.display = 'none';
            }
        } else {
            elements.btnDeleteReservation.style.display = 'none';
            elements.btnGenerateVoucher.style.display = 'none';
            elements.btnQuickCheckIn.style.display = 'none';
            elements.btnQuickCheckOut.style.display = 'none';
        }

        recalcReservationFinancials();
        updateModalRoomPicker();
        elements.reservationModal.classList.add('active');
    }

    // ==========================================================================
    // SELEÇÃO GUIADA DE APARTAMENTO NO MODAL (BASEADA NAS DATAS)
    // ==========================================================================
    window.openNewReservationWizard = function () {
        const today = new Date();
        const todayStr = formatDateString(today);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 2); // 2 diárias por padrão
        const tomorrowStr = formatDateString(tomorrow);

        openReservationModal({
            quartoId: '101',
            checkIn: todayStr,
            checkOut: tomorrowStr,
            status: 'confirmada'
        });
    };

    window.filterModalRooms = function (blockId) {
        state.modalRoomFilterBlock = blockId;
        const tabsContainer = document.getElementById('modalBlockTabs');
        if (tabsContainer) {
            tabsContainer.querySelectorAll('.modal-block-tab-btn').forEach(btn => {
                if (btn.dataset.tab === blockId) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
        updateModalRoomPicker();
    };

    window.selectModalRoom = function (roomId) {
        elements.resQuarto.value = roomId;
        recalcReservationFinancials();
        updateModalRoomPicker();
    };

    function updateModalRoomPicker() {
        const pickerGrid = document.getElementById('modalRoomPickerGrid');
        if (!pickerGrid) return;

        const checkIn = elements.resCheckIn.value;
        const checkOut = elements.resCheckOut.value;
        const currentResId = elements.resId.value || null;
        const selectedRoomId = elements.resQuarto.value;

        let roomsToDisplay = ROOMS;
        if (state.modalRoomFilterBlock && state.modalRoomFilterBlock !== 'all') {
            roomsToDisplay = ROOMS.filter(r => r.blocoId === state.modalRoomFilterBlock);
        }

        let html = '';
        roomsToDisplay.forEach(room => {
            let isAvail = true;
            let conflictMsg = '';

            if (checkIn && checkOut && checkIn < checkOut) {
                const availCheck = window.HotelPMS.isRoomAvailable(room.id, checkIn, checkOut, currentResId);
                isAvail = availCheck.available;
                if (!isAvail && availCheck.conflictingReservation) {
                    const conf = availCheck.conflictingReservation;
                    conflictMsg = `Ocupado por ${conf.hospedeNome} (${formatDateBR(conf.checkIn)} a ${formatDateBR(conf.checkOut)})`;
                }
            }

            const isSelected = String(room.id) === String(selectedRoomId);
            const isMaster = room.tipo === 'suite_master';
            const categoryShort = isMaster ? '⭐ Master' : (room.tipo === 'com_janela' ? '🪟 C/ Janela' : (room.tipo === 'sem_janela' ? '🚪 S/ Janela' : room.categoria.nome));

            html += `
            <div class="modal-room-card ${isAvail ? 'available' : 'occupied'} ${isSelected ? 'selected' : ''}"
                 onclick="${isAvail ? `window.selectModalRoom('${room.id}')` : ''}"
                 title="${isAvail ? `Quarto ${room.numero} livre para este período! Clique para selecionar.` : conflictMsg}">
                <div class="modal-room-number">${room.numero}</div>
                <div class="modal-room-category">${categoryShort}</div>
                <div class="modal-room-status-badge">
                    ${isSelected ? '★ Selecionado' : (isAvail ? '✓ Disponível' : '✕ Ocupado')}
                </div>
            </div>
        `;
        });

        pickerGrid.innerHTML = html;
    }

    function closeReservationModal() {
        elements.reservationModal.classList.remove('active');
        state.selectedReservation = null;
    }

    function recalcReservationFinancials() {
        const checkIn = elements.resCheckIn.value;
        const checkOut = elements.resCheckOut.value;
        const roomId = elements.resQuarto.value;
        const adultos = Number(elements.resAdultos.value) || 1;
        const criancas = Number(elements.resCriancas.value) || 0;
        const totalGuests = adultos + criancas;
        const valorPago = Number(elements.resValorPago.value) || 0;

        const nights = calculateNights(checkIn, checkOut);
        elements.resNightsDisplay.value = `${nights} noite${nights !== 1 ? 's' : ''}`;

        // Diária calculada automaticamente conforme tabela pré-definida na administração
        const autoDiaria = calculateRoomDailyRate(roomId, adultos, criancas);
        if (!state.selectedReservation || !state.selectedReservation.id) {
            elements.resDiaria.value = autoDiaria;
        } else {
            if (!elements.resDiaria.value || Number(elements.resDiaria.value) === 0) {
                elements.resDiaria.value = autoDiaria;
            }
        }

        const diaria = Number(elements.resDiaria.value) || autoDiaria;

        // Atualiza o display visual da diária no modal da recepção
        const room = getRoomById(roomId);
        const isMaster = (room && room.tipo === 'suite_master') || String(roomId) === '110' || String(roomId) === '210';
        if (elements.displayDiariaValor) {
            elements.displayDiariaValor.textContent = `R$ ${diaria.toFixed(2)}`;
        }
        if (elements.displayDiariaInfo) {
            elements.displayDiariaInfo.textContent = `${totalGuests} pessoa${totalGuests !== 1 ? 's' : ''} • ${isMaster ? '⭐ Suíte Master' : 'Tabela Padrão'}`;
        }

        let total = nights * diaria;
        if (elements.resValorTotal.value && state.selectedReservation && Number(elements.resValorTotal.value) !== total) {
            // Se já tinha um total customizado, preserva se o usuário não mudou datas
        } else {
            elements.resValorTotal.value = total;
        }

        total = Number(elements.resValorTotal.value) || total;
        const saldo = Math.max(0, total - valorPago);

        elements.summaryTotal.textContent = `R$ ${total.toFixed(2)}`;
        elements.summaryPaid.textContent = `R$ ${valorPago.toFixed(2)}`;
        elements.summaryDue.textContent = `R$ ${saldo.toFixed(2)}`;
    }

    // ==========================================================================
    // MODAL DE GESTÃO DE MANUTENÇÃO (INTERDITAR E LIBERAR QUARTO)
    // ==========================================================================
    function openBlockModal(res = null, defaultRoomId = null) {
        switchMaintenanceTab('form');

        const todayStr = formatDateString(new Date());
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 2);
        const tomorrowStr = formatDateString(tomorrow);

        if (res && res.id) {
            // Gerenciar / Editar quarto já em manutenção
            elements.blockId.value = res.id;
            elements.blockQuarto.value = res.quartoId;
            elements.blockQuarto.disabled = false;
            elements.blockCategoria.value = res.categoriaManutencao || inferMaintenanceCategory(res.observacoes || res.hospedeNome);
            elements.blockMotivo.value = res.observacoes || (res.hospedeNome ? res.hospedeNome.replace(/^🔧\s*(MANUTENÇÃO:\s*)?/i, '') : '');
            elements.blockTecnico.value = res.tecnico || (res.hospedeTelefone && res.hospedeTelefone !== '-' ? res.hospedeTelefone : '');
            elements.blockCheckIn.value = res.checkIn;
            elements.blockCheckOut.value = res.checkOut;

            const room = getRoomById(res.quartoId);
            const roomNum = room ? room.numero : res.quartoId;
            elements.blockModalTitle.textContent = `🔧 Gerenciar Manutenção - Quarto ${roomNum}`;
            elements.blockActiveBanner.style.display = 'block';
            elements.btnDeleteBlock.style.display = 'inline-flex';
            elements.btnSubmitBlock.innerHTML = '💾 Salvar Alterações';
        } else {
            // Novo bloqueio para manutenção
            elements.blockId.value = '';
            if (defaultRoomId) {
                elements.blockQuarto.value = defaultRoomId;
            }
            elements.blockQuarto.disabled = false;
            elements.blockCategoria.value = '🔧 Manutenção Geral';
            elements.blockMotivo.value = '';
            elements.blockTecnico.value = '';
            elements.blockCheckIn.value = todayStr;
            elements.blockCheckOut.value = tomorrowStr;

            elements.blockModalTitle.textContent = '🔧 Interditar Quarto para Manutenção';
            elements.blockActiveBanner.style.display = 'none';
            elements.btnDeleteBlock.style.display = 'none';
            elements.btnSubmitBlock.innerHTML = '🔒 Confirmar Interdição';
        }

        updateMaintenanceBadges();
        elements.blockModal.classList.add('active');
    }

    function closeBlockModal() {
        elements.blockModal.classList.remove('active');
    }

    function switchMaintenanceTab(tab) {
        if (!elements.tabBtnNewBlock || !elements.tabBtnActiveBlocks) return;
        if (tab === 'form') {
            elements.tabBtnNewBlock.classList.add('active');
            elements.tabBtnActiveBlocks.classList.remove('active');
            elements.blockFormPanel.style.display = 'block';
            elements.blockActiveListPanel.style.display = 'none';
        } else {
            elements.tabBtnActiveBlocks.classList.add('active');
            elements.tabBtnNewBlock.classList.remove('active');
            elements.blockFormPanel.style.display = 'none';
            elements.blockActiveListPanel.style.display = 'block';
            renderActiveBlocksList();
        }
    }

    function updateMaintenanceBadges() {
        const reservations = loadReservations();
        const todayStr = formatDateString(new Date());
        const allBlocks = reservations.filter(r => r.status === 'bloqueio');
        const activeTodayBlocks = allBlocks.filter(r => todayStr >= r.checkIn && todayStr < r.checkOut);

        if (elements.headerMaintenanceBadge) {
            if (activeTodayBlocks.length > 0) {
                elements.headerMaintenanceBadge.textContent = activeTodayBlocks.length;
                elements.headerMaintenanceBadge.style.display = 'inline-block';
            } else {
                elements.headerMaintenanceBadge.style.display = 'none';
            }
        }

        if (elements.countActiveBlocksBadge) {
            elements.countActiveBlocksBadge.textContent = allBlocks.length;
        }
    }

    function renderActiveBlocksList() {
        const container = elements.activeBlocksListContainer;
        if (!container) return;

        const reservations = loadReservations();
        const blocks = reservations
            .filter(r => r.status === 'bloqueio')
            .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

        if (blocks.length === 0) {
            container.innerHTML = `
            <div style="text-align: center; padding: 36px 16px; color: var(--text-muted);">
                <div style="font-size: 2.8rem; margin-bottom: 10px;">✨</div>
                <h4 style="color: #fff; font-size: 1.05rem; margin-bottom: 6px;">Nenhum quarto em manutenção</h4>
                <p style="font-size: 0.82rem; margin: 0;">Todos os 32 apartamentos estão liberados e operando normalmente.</p>
            </div>
        `;
            return;
        }

        let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;

        blocks.forEach(b => {
            const room = getRoomById(b.quartoId);
            const nights = b.noites || calculateNights(b.checkIn, b.checkOut);
            const todayStr = formatDateString(new Date());
            const isActiveToday = (todayStr >= b.checkIn && todayStr < b.checkOut);

            html += `
            <div class="active-block-card">
                <div style="flex: 1; min-width: 220px;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong style="color: #fff; font-size: 1.05rem;">Quarto ${room ? room.numero : b.quartoId}</strong>
                        <span class="room-badge ${room && room.categoria ? room.categoria.badgeClass : ''}">${room ? room.categoria.nome : ''}</span>
                        ${isActiveToday ? '<span style="background: rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 0.68rem; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">Ativo Hoje</span>' : '<span style="background: rgba(245, 158, 11, 0.2); color: #fde68a; font-size: 0.68rem; font-weight: 700; padding: 2px 7px; border-radius: 6px; border: 1px solid rgba(245, 158, 11, 0.3);">Programado</span>'}
                    </div>
                    <div style="font-size: 0.83rem; color: #e2e8f0; font-weight: 600; margin-bottom: 4px;">
                        ${b.categoriaManutencao || '🔧 Manutenção Geral'} • ${b.observacoes || 'Interditado'}
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 14px; flex-wrap: wrap;">
                        <span>📅 ${formatDateBR(b.checkIn)} até ${formatDateBR(b.checkOut)} (${nights} dia${nights !== 1 ? 's' : ''})</span>
                        ${b.tecnico ? `<span>👤 Técnico: <strong>${b.tecnico}</strong></span>` : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="window.editBlockFromList('${b.id}')" title="Editar dados ou datas">
                        ✏️ Editar
                    </button>
                    <button type="button" class="btn btn-danger btn-sm" onclick="window.releaseBlockFromList('${b.id}')" title="Liberar quarto para reservas">
                        🔓 Liberar Quarto
                    </button>
                </div>
            </div>
        `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    function inferMaintenanceCategory(text = '') {
        const t = text.toLowerCase();
        if (t.includes('ar') || t.includes('clima') || t.includes('split') || t.includes('refrig')) return '❄️ Ar Condicionado';
        if (t.includes('vaza') || t.includes('hidr') || t.includes('cano') || t.includes('chuveiro') || t.includes('torneira') || t.includes('esgoto')) return '💧 Hidráulica / Vazamento';
        if (t.includes('elétr') || t.includes('luz') || t.includes('fiação') || t.includes('tomada') || t.includes('disjuntor')) return '⚡ Elétrica / Iluminação';
        if (t.includes('pint') || t.includes('reforma') || t.includes('gesso') || t.includes('parede')) return '🎨 Pintura / Reforma';
        if (t.includes('cama') || t.includes('colch') || t.includes('móvel') || t.includes('mobil') || t.includes('armário')) return '🛏️ Mobília / Colchão';
        if (t.includes('limp') || t.includes('higien') || t.includes('faxina') || t.includes('mofo')) return '🧹 Limpeza Pesada';
        if (t.includes('porta') || t.includes('fechadura') || t.includes('janela') || t.includes('chave')) return '🚪 Fechaduras e Portas';
        return '🔧 Manutenção Geral';
    }

    window.editBlockFromList = function (blockId) {
        const reservations = loadReservations();
        const res = reservations.find(r => r.id === blockId);
        if (!res) return;
        openBlockModal(res);
    };

    window.releaseBlockFromList = function (blockId) {
        const reservations = loadReservations();
        const res = reservations.find(r => r.id === blockId);
        if (!res) return;

        const room = getRoomById(res.quartoId);
        const roomNum = room ? room.numero : res.quartoId;

        if (confirm(`Deseja realmente liberar o Quarto ${roomNum} da manutenção?\nEle voltará a ficar disponível para reservas imediatamente.`)) {
            deleteReservationById(blockId);
            showToast(`Quarto ${roomNum} liberado da manutenção com sucesso!`, 'success');
            updateDashboardKPIs();
            renderRoomStatusSquares();
            renderTimeline();
            updateMaintenanceBadges();
            renderActiveBlocksList();
        }
    };

    // ==========================================================================
    // MODAL DE VOUCHER / COMPROVANTE
    // ==========================================================================
    function openVoucherModal(res) {
        if (!res) return;
        const room = getRoomById(res.quartoId);
        const nights = res.noites || calculateNights(res.checkIn, res.checkOut);

        const voucherHtml = `
        <div class="voucher-header">
            <div>
                <h2>🌿 HOTEL DAS OLIVEIRAS</h2>
                <p style="color: #64748b; font-size: 0.8rem; margin: 0;">Comprovante Oficial de Reserva</p>
            </div>
            <div style="text-align: right;">
                <div style="font-weight: 800; font-size: 1.15rem; color: #0f172a;">${res.numeroNota ? `Nota: ${res.numeroNota}` : `#${res.id.slice(-6)}`}</div>
                <div style="font-size: 0.75rem; color: #64748b;">Emissão: ${new Date().toLocaleDateString('pt-BR')}</div>
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
            <div class="voucher-field"><strong>Valor da Diária:</strong> R$ ${Number(res.diaria || 0).toFixed(2)}</div>
            <div class="voucher-field"><strong>Valor Total:</strong> R$ ${Number(res.valorTotal).toFixed(2)}</div>
            <div class="voucher-field"><strong>Valor Pago / Sinal:</strong> R$ ${Number(res.valorPago).toFixed(2)} (${res.formaPagamento || 'PIX'})</div>
            <div class="voucher-field"><strong>Saldo a Pagar no Check-in:</strong> <span style="color: ${res.saldoPendente > 0 ? '#d97706' : '#059669'}; font-weight: 800;">R$ ${Number(res.saldoPendente).toFixed(2)}</span></div>
        </div>

        ${res.observacoes ? `
            <div class="voucher-section-title">Observações</div>
            <p style="font-size: 0.85rem; color: #334155; margin: 4px 0;">${res.observacoes}</p>
        ` : ''}

        <div style="margin-top: 24px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 0.75rem; color: #64748b; text-align: center;">
            Agradecemos a sua preferência! Desejamos uma excelente estadia no Hotel das Oliveiras.
        </div>
    `;

        elements.voucherContent.innerHTML = voucherHtml;
        elements.voucherModal.classList.add('active');
    }

    function copyVoucherWhatsApp(res) {
        if (!res) return;
        const room = getRoomById(res.quartoId);
        const nights = res.noites || calculateNights(res.checkIn, res.checkOut);

        const msg =
            `*🌿 HOTEL DAS OLIVEIRAS - CONFIRMAÇÃO DE RESERVA*
----------------------------------------
Olá, *${res.hospedeNome}*! Sua reserva está confirmada:

📌 *Reserva:* #${res.id.slice(-6)}
🏨 *Acomodação:* Quarto ${room ? room.numero : res.quartoId} - ${room ? room.categoria.nome : ''} (${room ? room.blocoNome : ''})
📅 *Check-in:* ${formatDateBR(res.checkIn)} (14h)
📅 *Check-out:* ${formatDateBR(res.checkOut)} (12h)
🌙 *Estadia:* ${nights} noite(s)
👥 *Hóspedes:* ${res.adultos || 2} adulto(s)${res.criancas ? ` e ${res.criancas} criança(s)` : ''}

💰 *Valor Total:* R$ ${Number(res.valorTotal).toFixed(2)}
💵 *Sinal Pago:* R$ ${Number(res.valorPago).toFixed(2)}
⚠️ *Saldo Restante:* R$ ${Number(res.saldoPendente).toFixed(2)} (no check-in)

Qualquer dúvida estamos à disposição! Tenha uma excelente viagem.`;

        navigator.clipboard.writeText(msg).then(() => {
            showToast('Texto do WhatsApp copiado com sucesso! Basta colar na conversa com o hóspede.', 'success');
        }).catch(() => {
            showToast('Não foi possível copiar automaticamente.', 'error');
        });
    }

    // ==========================================================================
    // CONFIGURAÇÃO DE EVENT LISTENERS
    // ==========================================================================
    function setupEventListeners() {
        elements.btnOpenReceivables.addEventListener('click', openReceivablesModal);
        elements.btnCloseReceivables.addEventListener('click', closeReceivablesModal);
        elements.btnCloseReceivablesFooter.addEventListener('click', closeReceivablesModal);
        elements.receivablesNoteSearch.addEventListener('input', renderReceivablesList);
        elements.receivablesDateFilter.addEventListener('change', renderReceivablesList);
        elements.btnClearReceivablesFilters.addEventListener('click', () => {
            elements.receivablesNoteSearch.value = '';
            elements.receivablesDateFilter.value = '';
            renderReceivablesList();
        });
        elements.receivablesModal.addEventListener('click', (event) => {
            if (event.target === elements.receivablesModal) closeReceivablesModal();
        });
        elements.receivablesList.addEventListener('click', (event) => {
            const button = event.target.closest('button[data-reservation-id]');
            if (!button) return;
            openReceptionPaymentModal(button.dataset.reservationId);
        });

        elements.btnCloseReceptionPayment.addEventListener('click', closeReceptionPaymentModal);
        elements.btnCancelReceptionPayment.addEventListener('click', closeReceptionPaymentModal);
        elements.receptionPaymentModal.addEventListener('click', (event) => {
            if (event.target === elements.receptionPaymentModal) closeReceptionPaymentModal();
        });
        elements.receptionPaymentForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!state.selectedPaymentReservationId) return;

            const result = recordReservationPayment(state.selectedPaymentReservationId, {
                valor: elements.receptionPaymentAmount.value,
                data: elements.receptionPaymentDate.value,
                formaPagamento: elements.receptionPaymentMethod.value
            });
            if (!result.success) {
                showToast(result.error, 'error');
                return;
            }

            closeReceptionPaymentModal();
            showToast('Pagamento registrado na nota.', 'success');
            updateDashboardKPIs();
            renderRoomStatusSquares();
            renderTimeline();
            renderReceivablesList();
        });
        elements.btnAssignReceptionLegacyPayment.addEventListener('click', () => {
            if (!state.selectedPaymentReservationId) return;

            const result = assignUnattributedReservationPayment(state.selectedPaymentReservationId, {
                valor: elements.receptionPaymentAmount.value,
                data: elements.receptionPaymentDate.value,
                formaPagamento: elements.receptionPaymentMethod.value
            });
            if (!result.success) {
                showToast(result.error, 'error');
                return;
            }

            closeReceptionPaymentModal();
            showToast('Pagamento anterior associado à data selecionada.', 'success');
            renderReceivablesList();
        });

        // Navegação temporal de Mês e Ano
        elements.selectMonth.addEventListener('change', (e) => {
            state.currentMonth = Number(e.target.value);
            renderTimeline();
        });

        elements.selectYear.addEventListener('change', (e) => {
            state.currentYear = Number(e.target.value);
            renderTimeline();
        });

        elements.btnPrevMonth.addEventListener('click', () => {
            if (state.currentMonth === 0) {
                state.currentMonth = 11;
                state.currentYear--;
            } else {
                state.currentMonth--;
            }
            elements.selectMonth.value = state.currentMonth;
            elements.selectYear.value = state.currentYear;
            renderTimeline();
        });

        elements.btnNextMonth.addEventListener('click', () => {
            if (state.currentMonth === 11) {
                state.currentMonth = 0;
                state.currentYear++;
            } else {
                state.currentMonth++;
            }
            elements.selectMonth.value = state.currentMonth;
            elements.selectYear.value = state.currentYear;
            renderTimeline();
        });

        elements.btnToday.addEventListener('click', () => {
            const now = new Date();
            state.currentMonth = now.getMonth();
            state.currentYear = now.getFullYear();
            elements.selectMonth.value = state.currentMonth;
            elements.selectYear.value = state.currentYear;
            renderTimeline();
        });

        // Busca Rápida
        elements.inputSearch.addEventListener('input', (e) => {
            state.searchQuery = e.target.value;
            renderTimeline();
        });

        // Filtros de Bloco
        window.setBlockFilter = function (blockId) {
            state.filterBlock = blockId;
            if (elements.blockFilters) {
                elements.blockFilters.querySelectorAll('.filter-btn').forEach(btn => {
                    if (btn.getAttribute('data-block') === blockId) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
            renderRoomStatusSquares();
            renderTimeline();

            const blockDescriptions = {
                'all': 'Exibindo todos os 32 quartos do Hotel das Oliveiras',
                'bloco-1': 'Exibindo Bloco 1 (Térreo) • 10 quartos (101 ao 110)',
                'bloco-2': 'Exibindo Bloco 2 (1º Andar) • 10 quartos (201 ao 210)',
                'bloco-3': 'Exibindo Bloco 3 • 8 quartos (111 ao 118)',
                'bloco-4': 'Exibindo Bloco 4 • 4 quartos (211 ao 214)'
            };
            if (blockDescriptions[blockId]) {
                showToast(blockDescriptions[blockId], 'info');
            }
        };

        elements.blockFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn || !btn.dataset.block) return;
            window.setBlockFilter(btn.dataset.block);
        });

        // Filtros de Tipo de Quarto
        window.setTypeFilter = function (typeId) {
            state.filterType = typeId;
            if (elements.typeFilters) {
                elements.typeFilters.querySelectorAll('.filter-btn').forEach(btn => {
                    if (btn.getAttribute('data-type') === typeId) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
            }
            renderRoomStatusSquares();
            renderTimeline();
        };

        elements.typeFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (!btn || !btn.dataset.type) return;
            window.setTypeFilter(btn.dataset.type);
        });

        // Abrir Modal de Nova Reserva pelo botão do topo
        elements.btnNewReservation.addEventListener('click', () => {
            window.openNewReservationWizard();
        });

        // Recálculo automático ao mudar datas, quarto ou quantidade de hóspedes
        elements.resQuarto.addEventListener('change', () => {
            recalcReservationFinancials();
            updateModalRoomPicker();
        });

        elements.resCheckIn.addEventListener('change', () => {
            recalcReservationFinancials();
            updateModalRoomPicker();
        });
        elements.resCheckOut.addEventListener('change', () => {
            recalcReservationFinancials();
            updateModalRoomPicker();
        });
        if (elements.resAdultos) {
            elements.resAdultos.addEventListener('input', recalcReservationFinancials);
            elements.resAdultos.addEventListener('change', recalcReservationFinancials);
        }
        if (elements.resCriancas) {
            elements.resCriancas.addEventListener('input', recalcReservationFinancials);
            elements.resCriancas.addEventListener('change', recalcReservationFinancials);
        }
        elements.resValorTotal.addEventListener('input', recalcReservationFinancials);
        elements.resValorPago.addEventListener('input', recalcReservationFinancials);

        // Salvar Reserva (Submit Form)
        elements.reservationForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const payload = {
                id: elements.resId.value || null,
                numeroNota: (state.selectedReservation && state.selectedReservation.numeroNota) ? state.selectedReservation.numeroNota : null,
                quartoId: elements.resQuarto.value,
                status: elements.resStatus.value,
                diaria: Number(elements.resDiaria.value),
                checkIn: elements.resCheckIn.value,
                checkOut: elements.resCheckOut.value,
                hospedeNome: elements.resNome.value.trim(),
                hospedeTelefone: elements.resTelefone.value.trim(),
                hospedeCpf: elements.resCpf.value.trim(),
                hospedeCidade: elements.resCidade.value.trim(),
                adultos: Number(elements.resAdultos.value),
                criancas: Number(elements.resCriancas.value),
                valorTotal: Number(elements.resValorTotal.value),
                valorPago: Number(elements.resValorPago.value),
                formaPagamento: elements.resFormaPagamento.value,
                observacoes: elements.resObs.value.trim()
            };

            const result = saveOrUpdateReservation(payload);
            if (!result.success) {
                showToast(result.error, 'error');
                return;
            }

            showToast(payload.id ? 'Reserva atualizada com sucesso!' : 'Reserva criada com sucesso!', 'success');
            closeReservationModal();
            updateDashboardKPIs();
            renderRoomStatusSquares();
            renderTimeline();
        });

        // Fechar Modal de Reserva
        elements.btnCloseResModal.addEventListener('click', closeReservationModal);
        elements.btnCancelModal.addEventListener('click', closeReservationModal);

        // Excluir Reserva
        elements.btnDeleteReservation.addEventListener('click', () => {
            if (!state.selectedReservation) return;
            if (confirm(`Tem certeza que deseja excluir permanentemente a reserva de "${state.selectedReservation.hospedeNome}"?`)) {
                deleteReservationById(state.selectedReservation.id);
                showToast('Reserva excluída.', 'info');
                closeReservationModal();
                updateDashboardKPIs();
                renderRoomStatusSquares();
                renderTimeline();
                updateMaintenanceBadges();
            }
        });

        // Check-in e Check-out Rápidos
        elements.btnQuickCheckIn.addEventListener('click', () => {
            if (!state.selectedReservation) return;
            updateReservationStatus(state.selectedReservation.id, 'hospedado');
            showToast(`Check-in realizado para ${state.selectedReservation.hospedeNome}!`, 'success');
            closeReservationModal();
            updateDashboardKPIs();
            renderRoomStatusSquares();
            renderTimeline();
        });

        elements.btnQuickCheckOut.addEventListener('click', () => {
            if (!state.selectedReservation) return;
            updateReservationStatus(state.selectedReservation.id, 'finalizada');
            showToast(`Check-out finalizado para ${state.selectedReservation.hospedeNome}!`, 'success');
            closeReservationModal();
            updateDashboardKPIs();
            renderRoomStatusSquares();
            renderTimeline();
        });

        // Abrir Voucher pelo modal de reserva
        elements.btnGenerateVoucher.addEventListener('click', () => {
            if (!state.selectedReservation) return;
            openVoucherModal(state.selectedReservation);
        });

        // Voucher Modals Actions
        elements.btnCloseVoucherModal.addEventListener('click', () => elements.voucherModal.classList.remove('active'));
        elements.btnCloseVoucherBtn.addEventListener('click', () => elements.voucherModal.classList.remove('active'));
        elements.btnPrintVoucher.addEventListener('click', () => window.print());
        elements.btnCopyWhatsApp.addEventListener('click', () => {
            if (state.selectedReservation) {
                copyVoucherWhatsApp(state.selectedReservation);
            }
        });

        // Modal de Manutenção / Bloqueio
        elements.btnNewBlock.addEventListener('click', () => openBlockModal());
        elements.btnCloseBlockModal.addEventListener('click', closeBlockModal);
        elements.btnCancelBlockModal.addEventListener('click', closeBlockModal);
        if (elements.btnCloseActiveBlocksPanel) {
            elements.btnCloseActiveBlocksPanel.addEventListener('click', closeBlockModal);
        }

        // Abas do modal
        if (elements.tabBtnNewBlock) {
            elements.tabBtnNewBlock.addEventListener('click', () => switchMaintenanceTab('form'));
        }
        if (elements.tabBtnActiveBlocks) {
            elements.tabBtnActiveBlocks.addEventListener('click', () => switchMaintenanceTab('list'));
        }

        // Botão Liberar Quarto no formulário
        if (elements.btnDeleteBlock) {
            elements.btnDeleteBlock.addEventListener('click', () => {
                const blockId = elements.blockId.value;
                if (!blockId) return;

                const reservations = loadReservations();
                const res = reservations.find(r => r.id === blockId);
                const room = res ? getRoomById(res.quartoId) : getRoomById(elements.blockQuarto.value);
                const roomNum = room ? room.numero : (res ? res.quartoId : 'selecionado');

                if (confirm(`Deseja realmente liberar o Quarto ${roomNum} da manutenção?\nEle voltará a ficar disponível para reservas imediatamente.`)) {
                    deleteReservationById(blockId);
                    showToast(`Quarto ${roomNum} liberado da manutenção com sucesso!`, 'success');
                    closeBlockModal();
                    updateDashboardKPIs();
                    renderRoomStatusSquares();
                    renderTimeline();
                    updateMaintenanceBadges();
                }
            });
        }

        // Salvar ou Atualizar Bloqueio para Manutenção
        elements.blockForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const blockId = elements.blockId.value || null;
            const motivo = elements.blockMotivo.value.trim();
            const categoria = elements.blockCategoria.value;
            const tecnico = elements.blockTecnico.value.trim();
            const quartoId = elements.blockQuarto.value;

            const payload = {
                id: blockId,
                quartoId: quartoId,
                hospedeNome: `🔧 MANUTENÇÃO: ${motivo}`,
                hospedeTelefone: tecnico || '-',
                hospedeCpf: '-',
                hospedeCidade: '-',
                checkIn: elements.blockCheckIn.value,
                checkOut: elements.blockCheckOut.value,
                adultos: 0,
                criancas: 0,
                status: 'bloqueio',
                diaria: 0,
                valorTotal: 0,
                valorPago: 0,
                saldoPendente: 0,
                formaPagamento: 'N/A',
                observacoes: motivo,
                categoriaManutencao: categoria,
                tecnico: tecnico
            };

            const result = saveOrUpdateReservation(payload);
            if (!result.success) {
                showToast(result.error, 'error');
                return;
            }

            const room = getRoomById(quartoId);
            const roomNum = room ? room.numero : quartoId;
            showToast(blockId ? `Manutenção do Quarto ${roomNum} atualizada!` : `Quarto ${roomNum} interditado para manutenção com sucesso!`, 'success');
            closeBlockModal();
            updateDashboardKPIs();
            renderRoomStatusSquares();
            renderTimeline();
            updateMaintenanceBadges();
        });

        // Fechar modais com tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeReservationModal();
                closeBlockModal();
                closeReceptionPaymentModal();
                closeReceivablesModal();
                elements.voucherModal.classList.remove('active');
            }
        });
    }

    // ==========================================================================
    // TOAST NOTIFICATIONS
    // ==========================================================================
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

        elements.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

})();

