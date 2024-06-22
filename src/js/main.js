document.addEventListener("DOMContentLoaded", function() {
  const storeFilter = document.getElementById('store-filter');
  const startDateElem = document.getElementById('start-date');
  const endDateElem = document.getElementById('end-date');
  const fetchDataBtn = document.getElementById('fetch-data-btn');
  const dateWarning = document.getElementById('date-warning');

  const totalOrdersElem = document.getElementById('total-orders');
  const lateOrdersElem = document.getElementById('late-orders');
  const avgDispatchTimeElem = document.getElementById('avg-dispatch-time');
  const avgPrepTimeElem = document.getElementById('avg-prep-time');
  const preparingOrdersElem = document.getElementById('preparing-orders');
  const readyOrdersElem = document.getElementById('ready-orders');
  const dispatchedOrdersElem = document.getElementById('dispatched-orders');

  // Set initial date values
  const now = new Date();
  startDateElem.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T00:00`;
  endDateElem.value = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}T23:59`;

  function fetchData() {
      const start = startDateElem.value ? startDateElem.value.replace('T', ' ') + ":00" : `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} 00:00:00`;
      const end = endDateElem.value ? endDateElem.value.replace('T', ' ') + ":00" : `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} 23:59:59`;

      // Check if selected dates are today
      const selectedStartDate = new Date(start);
      const selectedEndDate = new Date(end);
      const isToday = selectedStartDate.toDateString() === now.toDateString() && selectedEndDate.toDateString() === now.toDateString();
      dateWarning.classList.toggle('hidden', isToday);

      axios.post('https://vemprodeck.com.br/dispatch-bot/api/index.php', {
          method: 'getOrdersDeliveryByPeriod',
          data: {
              start: start,
              end: end,
          }
      })
      .then(response => {
          updateDashboard(response.data);
      })
      .catch(error => {
          console.error('Error fetching data:', error);
      });
  }

  function updateDashboard(data) {
    const storeCnpj = storeFilter.value;
    if (storeCnpj !== "all") {
      data = data.filter(order => order.cnpj === storeCnpj);
    }
  
    // Process data and update indicators
    totalOrdersElem.textContent = data.length;
    const lateOrders = data.filter(order => order.hora_saida === "0000-00-00 00:00:00" && (new Date() - new Date(order.hora_abertura)) / 60000 > 30);
    lateOrdersElem.textContent = lateOrders.length;
    
    // Update late orders card with red text and icon if there are late orders
    if (lateOrders.length > 0) {
      lateOrdersElem.classList.add('text-red-600');
      document.getElementById('late-orders-card').classList.add('late');
    } else {
      lateOrdersElem.classList.remove('text-red-600');
      document.getElementById('late-orders-card').classList.remove('late');
    }
  
    avgDispatchTimeElem.textContent = calculateAverageDispatchTime(data) + ' min';
    avgPrepTimeElem.textContent = calculateAveragePrepTime(data) + ' min';
  
    // Update Kanban lists
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

  function updateKanbanLists(data) {
    const preparingOrders = data.filter(order => order.hora_saida === "0000-00-00 00:00:00" && order.tempo_preparo === "0000-00-00 00:00:00");
    const readyOrders = data.filter(order => order.hora_saida === "0000-00-00 00:00:00" && order.tempo_preparo !== "0000-00-00 00:00:00");
    const dispatchedOrders = data.filter(order => order.hora_saida !== "0000-00-00 00:00:00" && order.tempo_preparo !== "0000-00-00 00:00:00" && order.hora_abertura !== "0000-00-00 00:00:00");

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

        const orderElem = document.createElement('tr');
        orderElem.innerHTML = `
            <td class="border-b border-[#eee] px-4 py-5 pl-9 dark:border-strokedark xl:pl-11">
              <h5 class="font-medium text-black dark:text-white">${order.identificador_conta}</h5>
              <p class="text-sm">${order.intg_tipo} - ${order.num_controle}</p>
              <p class="text-sm">${order.hora_abertura}</p>
            </td>
            <td class="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
              <p class="inline-flex rounded-full ${statusClass} bg-opacity-10 px-3 py-1 text-sm font-medium">
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

        const orderElem = document.createElement('tr');
        orderElem.innerHTML = `
            <td class="border-b border-[#eee] px-4 py-5 pl-9 dark:border-strokedark xl:pl-11">
              <h5 class="font-medium text-black dark:text-white">${order.identificador_conta}</h5>
              <p class="text-sm">${order.intg_tipo} - ${order.num_controle}</p>
              <p class="text-sm">${order.hora_abertura}</p>
            </td>
            <td class="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
              <p class="inline-flex rounded-full ${statusClass} bg-opacity-10 px-3 py-1 text-sm font-medium">
                ${timeOpen} min
              </p>
            </td>
        `;
        readyOrdersElem.appendChild(orderElem);
    });

    dispatchedOrders.forEach(order => {
        const orderElem = document.createElement('tr');
        orderElem.innerHTML = `
            <td class="border-b border-[#eee] px-4 py-5 pl-9 dark:border-strokedark xl:pl-11">
              <h5 class="font-medium text-black dark:text-white">${order.identificador_conta}</h5>
              <p class="text-sm">${order.intg_tipo} - ${order.num_controle}</p>
              <p class="text-sm">${order.hora_abertura}</p>
            </td>
            <td class="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
              <p class="inline-flex rounded-full bg-blue-500 bg-opacity-10 px-3 py-1 text-sm font-small text-blue-800">
                ${order.hora_saida}
              </p>
            </td>
        `;
        dispatchedOrdersElem.appendChild(orderElem);
    });
}


  function calculateTimeOpen(horaAbertura) {
      return Math.round((new Date() - new Date(horaAbertura)) / 60000);
  }

  fetchDataBtn.addEventListener('click', fetchData);
  storeFilter.addEventListener('change', fetchData);

  fetchData();
  setInterval(fetchData, 60000); // Atualiza a cada minuto
});


