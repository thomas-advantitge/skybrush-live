import {
  CategoryScale,
  Chart as ChartJS,
  Decimation,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  Decimation,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

export { Line as default } from 'react-chartjs-2';
