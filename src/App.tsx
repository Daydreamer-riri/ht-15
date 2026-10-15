import { RoutePlan } from './components/route/RoutePlan';
import { itinerary } from './data/itinerary';
import './App.css';

function App() {
  return <RoutePlan itinerary={itinerary} />;
}

export default App;
