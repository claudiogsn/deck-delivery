import ApexCharts from "apexcharts";

// Função para buscar dados do endpoint
const fetchChartData = async () => {
  const now = new Date();
  const start = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} 00:00:00`;
  const end = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} 23:59:59`;

  try {
    const response = await fetch('https://vemprodeck.com.br/dispatch-bot/api/index.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        method: 'getOrdersChartData',
        data: {
          start: '2024-07-01 00:00:00',
          end: '2024-07-01 23:59:59'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    console.log('Data received from API:', data);
    return data || [];
  } catch (error) {
    console.error('Fetch chart data failed:', error);
    return [];
  }
};

// Função para gerar uma cor aleatória
const getRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

// Função para criar dinamicamente os elementos das lojas
const createStoreElements = (seriesData) => {
  const storeInfoContainer = document.getElementById('store-info-container');
  storeInfoContainer.innerHTML = ''; // Limpa o contêiner

  const colors = seriesData.map(() => getRandomColor());

  seriesData.forEach((store, index) => {
    const storeColor = colors[index];
    const storeElement = `
      <div class="flex min-w-47.5">
        <span class="mr-2 mt-1 flex h-4 w-full max-w-4 items-center justify-center rounded-full border" style="border-color: ${storeColor}">
          <span class="block h-2.5 w-full max-w-2.5 rounded-full" style="background-color: ${storeColor}"></span>
        </span>
        <div class="w-full">
          <p class="font-semibold" style="color: ${storeColor}">${store.name}</p>
          <p class="text-sm font-medium">Total Pedidos</p>
        </div>
      </div>
    `;
    storeInfoContainer.insertAdjacentHTML('beforeend', storeElement);
  });

  return colors; // Retorna as cores para uso no gráfico
};

// ===== chartOne
const chart01 = async () => {
  const seriesData = await fetchChartData();

  const colors = createStoreElements(seriesData); // Chama a função para criar os elementos das lojas e obter as cores

  console.log(seriesData);

  const chartOneOptions = {
    series: seriesData.length ? seriesData.map(item => ({
      name: item.name,
      data: item.data
    })) : [ ],
    legend: {
      show: false,
      position: "top",
      horizontalAlign: "left",
    },
    colors: colors.length ? colors : ["#3C50E0", "#80CAEE", "#3056D3"],
    chart: {
      fontFamily: "Satoshi, sans-serif",
      height: 335,
      type: "area",
      dropShadow: {
        enabled: true,
        color: "#623CEA14",
        top: 10,
        blur: 4,
        left: 0,
        opacity: 0.1,
      },
      toolbar: {
        show: false,
      },
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 300,
          },
        },
      },
      {
        breakpoint: 1366,
        options: {
          chart: {
            height: 350,
          },
        },
      },
    ],
    stroke: {
      width: [2, 2],
      curve: "straight",
    },
    markers: {
      size: 0,
    },
    labels: {
      show: false,
      position: "top",
    },
    grid: {
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 4,
      colors: "#fff",
      strokeColors: colors.length ? colors : ["#3056D3", "#80CAEE"],
      strokeWidth: 3,
      strokeOpacity: 0.9,
      strokeDashArray: 0,
      fillOpacity: 1,
      discrete: [],
      hover: {
        size: undefined,
        sizeOffset: 5,
      },
    },
    xaxis: {
      type: "category",
      categories: [
        "12h",
        "13h",
        "14h",
        "15h",
        "16h",
        "17h",
        "18h",
        "19h",
        "20h",
        "21h",
        "22h",
        "23h",
      ],
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      title: {
        style: {
          fontSize: "0px",
        },
      },
      min: 0,
      max: 150,
    },
  };

  const chartSelector = document.querySelectorAll("#chartOne");

  if (chartSelector.length) {
    const chartOne = new ApexCharts(
      document.querySelector("#chartOne"),
      chartOneOptions
    );
    chartOne.render();
  }
};

export default chart01;
