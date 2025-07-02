import { Form } from './components/Form';
import { Playground } from './components/Playground';
import { Separator } from './components/ui/separator';
import './App.css';

function App() {
  return (
    <div className="w-7xl min-h-96 mx-auto flex mt-30">
      <Form />
      <Separator
        orientation="vertical"
        className="mx-8"
      />
      <Playground />
    </div>
  );
}

export default App;
