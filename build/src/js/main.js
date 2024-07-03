document.addEventListener("DOMContentLoaded", function () {
  const storeFilterElem = document.getElementById('store-filter');
  const integrationFilterElem = document.getElementById('integration-filter');
  const startDateElem = document.getElementById('start-date');
  const endDateElem = document.getElementById('end-date');
  const fetchDataBtn = document.getElementById('fetch-data-btn');
  const dateWarning = document.getElementById('date-warning');
  const searchOrderElem = document.getElementById('search-order');
  const totalOrdersElem = document.getElementById('total-orders');
  const lateOrdersElem = document.getElementById('late-orders');
  const avgDispatchTimeElem = document.getElementById('avg-dispatch-time');
  const avgPrepTimeElem = document.getElementById('avg-prep-time');
  const avgWaitingTimeElem = document.getElementById('avg-waiting-time');
  const preparingOrdersElem = document.getElementById('preparing-orders');
  const readyOrdersElem = document.getElementById('ready-orders');
  const dispatchedOrdersElem = document.getElementById('dispatched-orders');
  const toggleChartBtn = document.getElementById('toggle-chart-btn');
  const chartContainer = document.getElementById('chart-container');

  toggleChartBtn.addEventListener('click', function() {
    chartContainer.classList.toggle('hidden');
    toggleChartBtn.textContent = chartContainer.classList.contains('hidden') ? 'Expandir Gráfico' : 'Recolher Gráfico';
  });

  const now = new Date();
  startDateElem.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T00:00`;
  endDateElem.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T23:59`;

  function fetchData() {
    const start = startDateElem.value ? startDateElem.value.replace('T', ' ') + ":00" : `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} 00:00:00`;
    const end = endDateElem.value ? endDateElem.value.replace('T', ' ') + ":00" : `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} 23:59:59`;
    
    const selectedStartDate = new Date(start);
    const selectedEndDate = new Date(end);
    const isToday = selectedStartDate.toDateString() === now.toDateString() && selectedEndDate.toDateString() === now.toDateString();
    dateWarning.classList.toggle('hidden', isToday);
    
    axios.post('https://vemprodeck.com.br/dispatch-bot/api/index.php', {
      method: 'getOrdersDeliveryByPeriod',
      data: { start: start, end: end }
    }).then(response => {
      updateDashboard(response.data);
    }).catch(error => {
      console.error('Error fetching data:', error);
    });
  }

  function updateDashboard(data) {
    const storeCnpjs = Array.from(storeFilterElem.selectedOptions).map(option => option.value);
    if (!storeCnpjs.includes("all")) {
      data = data.filter(order => storeCnpjs.includes(order.cnpj));
    }
    const integrationTypes = Array.from(integrationFilterElem.selectedOptions).map(option => option.value);
    if (!integrationTypes.includes("all")) {
      data = data.filter(order => integrationTypes.includes(order.intg_tipo));
    }
    const searchQuery = searchOrderElem.value.toLowerCase();
    if (searchQuery) {
      data = data.filter(order => order.identificador_conta.toLowerCase().includes(searchQuery) || order.num_controle.toLowerCase().includes(searchQuery));
    }

    totalOrdersElem.textContent = data.length;
    const lateOrders = data.filter(order => order.hora_saida === "0000-00-00 00:00:00" && (new Date() - new Date(order.hora_abertura)) / 60000 > 30);
    lateOrdersElem.textContent = lateOrders.length;
    if (lateOrders.length > 0) {
      lateOrdersElem.classList.add('text-red-600');
      document.getElementById('late-orders-card').classList.add('late');
    } else {
      lateOrdersElem.classList.remove('text-red-600');
      document.getElementById('late-orders-card').classList.remove('late');
    }
    avgDispatchTimeElem.textContent = calculateAverageDispatchTime(data) + ' min';
    avgPrepTimeElem.textContent = calculateAveragePrepTime(data) + ' min';
    avgWaitingTimeElem.textContent = calculateAverageWaitingTime(data) + ' min';
    updateKanbanLists(data);
  }

  function calculateAverageDispatchTime(data) {
    const dispatchTimes = data.filter(order => order.hora_saida !== "0000-00-00 00:00:00").map(order => (new Date(order.hora_saida) - new Date(order.hora_abertura)) / 60000);
    const totalDispatchTime = dispatchTimes.reduce((a, b) => a + b, 0);
    return Math.round(totalDispatchTime / dispatchTimes.length);
  }

  function calculateAveragePrepTime(data) {
    const prepTimes = data.filter(order => order.tempo_preparo !== "0000-00-00 00:00:00").map(order => (new Date(order.tempo_preparo) - new Date(order.hora_abertura)) / 60000);
    const totalPrepTime = prepTimes.reduce((a, b) => a + b, 0);
    return Math.round(totalPrepTime / prepTimes.length);
  }

  function calculateAverageWaitingTime(data) {
    const waitingTimes = data.filter(order => order.hora_saida !== "0000-00-00 00:00:00" && order.tempo_preparo !== "0000-00-00 00:00:00").map(order => (new Date(order.hora_saida) - new Date(order.tempo_preparo)) / 60000);
    const totalWaitingTime = waitingTimes.reduce((a, b) => a + b, 0);
    return Math.round(totalWaitingTime / waitingTimes.length);
  }

  function updateKanbanLists(data) {
    const preparingOrders = data.filter(order => order.hora_saida === "0000-00-00 00:00:00" && order.tempo_preparo === "0000-00-00 00:00:00");
    const readyOrders = data.filter(order => order.hora_saida === "0000-00-00 00:00:00" && order.tempo_preparo !== "0000-00-00 00:00:00");
    const dispatchedOrders = data.filter(order => order.hora_saida !== "0000-00-00 00:00:00");
    preparingOrdersElem.innerHTML = '';
    readyOrdersElem.innerHTML = '';
    dispatchedOrdersElem.innerHTML = '';

    preparingOrders.forEach(order => {
      const timeOpen = calculateTimeOpen(order.hora_abertura);
      let statusClass = 'bg-success text-success';
      if (timeOpen >= 20 && timeOpen < 30) {
        statusClass = 'bg-warning text-warning';
      } else if (timeOpen >= 30) {
        statusClass = 'bg-danger text-danger';
      }
      const formattedHoraAbertura = formatDateTime(order.hora_abertura);
      const orderElem = document.createElement('tr');
      orderElem.innerHTML = `
        <td class="border-b border-[#eee] ${statusClass} bg-opacity-10 px-4 py-5 pl-9 dark:border-strokedark xl:pl-11">
          <h5 class="font-medium">${order.identificador_conta}</h5>
          <p class="text-sm">${order.intg_tipo} - ${order.num_controle}</p>
          <p class="text-sm">Abertura: ${formattedHoraAbertura}</p>
        </td>
        <td class="border-b border-[#eee] ${statusClass} bg-opacity-10 px-4 py-5 dark:border-strokedark">
          <p class="inline-flex px-3 py-1 text-sm font-medium">
            ${timeOpen} min
          </p>
        </td>
      `;
      preparingOrdersElem.appendChild(orderElem);
    });

    readyOrders.forEach(order => {
      const timeOpen = calculateTimeOpen(order.hora_abertura);
      let statusClass = 'bg-success text-success';
      if (timeOpen >= 20 && timeOpen < 30) {
        statusClass = 'bg-warning text-warning';
      } else if (timeOpen >= 30) {
        statusClass = 'bg-danger text-danger';
      }
      const formattedHoraAbertura = formatDateTime(order.hora_abertura);
      const orderElem = document.createElement('tr');
      orderElem.innerHTML = `
        <td class="border-b border-[#eee] ${statusClass} bg-opacity-10  px-4 py-5 pl-9 dark:border-strokedark xl:pl-11">
          <h5 class="font-medium">${order.identificador_conta}</h5>
          <p class="text-sm">${order.intg_tipo} - ${order.num_controle}</p>
          <p class="text-sm">Abertura: ${formattedHoraAbertura}</p>
        </td>
        <td class="border-b border-[#eee] ${statusClass} bg-opacity-10  px-4 py-5 dark:border-strokedark">
          <p class="inline-flex px-3 py-1 text-sm font-medium">
            ${timeOpen} min
          </p>
        </td>
      `;
      readyOrdersElem.appendChild(orderElem);
    });

    dispatchedOrders.sort((a, b) => new Date(b.hora_saida) - new Date(a.hora_saida)).forEach(order => {
      const timeOpen = Math.round((new Date(order.hora_saida) - new Date(order.hora_abertura)) / 60000);
      const isLate = timeOpen > 30;
      let statusClass = 'bg-success text-success';
      if (isLate) {
        statusClass = 'bg-danger text-danger';
      }
      const formattedHoraSaida = formatDateTime(order.hora_saida);
      const formattedHoraAbertura = formatDateTime(order.hora_abertura);
      const orderElem = document.createElement('tr');
      orderElem.innerHTML = `
        <td class="border-b border-[#eee] ${statusClass} bg-opacity-10 px-4 py-5 pl-9 dark:border-strokedark xl:pl-11">
          <h5 class="font-medium ">${order.identificador_conta}</h5>
          <p class="text-sm ">${order.intg_tipo} - ${order.num_controle}</p>
          <p class="text-sm ">Abertura: ${formattedHoraAbertura}</p>
          <p class="text-sm ">Saida: ${formattedHoraSaida}</p>
        </td>
        <td class="border-b border-[#eee] ${statusClass} bg-opacity-10 px-4 py-5 dark:border-strokedark">
          <p class="inline-flex rounded-full px-3 py-1 text-sm font-medium">
            ${timeOpen} min
          </p>
        </td>
      `;
      dispatchedOrdersElem.appendChild(orderElem);
    });
  }

  function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function calculateTimeOpen(horaAbertura) {
    return Math.round((new Date() - new Date(horaAbertura)) / 60000);
  }

  searchOrderElem.addEventListener('input', fetchData);
  fetchDataBtn.addEventListener('click', fetchData);
  storeFilterElem.addEventListener('change', fetchData);
  integrationFilterElem.addEventListener('change', fetchData);
  fetchData();
  setInterval(fetchData, 15000);
});
