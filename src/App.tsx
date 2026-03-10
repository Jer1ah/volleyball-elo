import { useEffect, useState } from "react" 

const App = () => {
  const [isButtonClicked, setIsButtonClicked] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsButtonClicked(false);
    }, 5000);
  }, [isButtonClicked]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}> 
      {!isButtonClicked && <button onClick={() => setIsButtonClicked(true)}>Click for Surprise</button>}
      {isButtonClicked && <p style={{ fontWeight: 'bold', fontSize: '24px' }}>Benji sucks at volleyball</p>}
    </div>
  )
}

export default App
