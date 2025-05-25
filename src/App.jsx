import { useState, useEffect, useCallback } from 'react';
import './App.css';
import ValidatorDetailPage from './ValidatorDetailPage';

const API_BASE_URL = 'https://api.winnode.xyz';

const getStatusClass = (status) => {
  if (!status) return 'status-unknown';
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('active') || lowerStatus.includes('bonded')) return 'status-active';
  if (lowerStatus.includes('jailed')) return 'status-jailed';
  if (lowerStatus.includes('unbonding')) return 'status-unbonding';
  if (lowerStatus.includes('unbonded')) return 'status-unbonded';
  return 'status-unknown';
};

const getUptimeClass = (uptime) => {
  if (typeof uptime !== 'number') return 'uptime-unknown';
  if (uptime >= 95) return 'uptime-high';
  if (uptime >= 90) return 'uptime-medium';
  return 'uptime-low';
};

function App() {
  const [validators, setValidators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [selectedValidator, setSelectedValidator] = useState(null);
  const [blocksByChain, setBlocksByChain] = useState({});

  const animateBlocks = useCallback(() => {
    setBlocksByChain(prevBlocksByChain => {
      const updatedBlocks = {};
      for (const chain in prevBlocksByChain) {
        const currentBlocks = prevBlocksByChain[chain];
        if (currentBlocks.length > 0) { 
          const newBlockHeight = currentBlocks[currentBlocks.length - 1].height + 1;
          const isNewBlockMissed = Math.random() < 0.1; 

          let newBlocksArray = [
            ...currentBlocks.slice(1),
            {
              id: `${chain}-block-${Date.now()}-${Math.random()}`,
              height: newBlockHeight,
              isMissed: isNewBlockMissed
            }
          ];
          
          while (newBlocksArray.length < 28 && newBlocksArray.length > 0) {
             const lastHeight = newBlocksArray[newBlocksArray.length -1].height;
             const isFillBlockMissed = Math.random() < 0.05;
             newBlocksArray.unshift({
               id: `${chain}-fill-${Date.now()}-${Math.random()}`,
               height: lastHeight - (28 - newBlocksArray.length),
               isMissed: isFillBlockMissed
             });
          }
          updatedBlocks[chain] = newBlocksArray;
        } else {
          updatedBlocks[chain] = Array.from({ length: 28 }, (_, i) => ({ 
            id: `${chain}-reinit-block-${i}-${Date.now()}`,
            height: (Math.floor(Math.random() * 1000) + 12000 + i),
            isMissed: Math.random() < 0.1
          }));
        }
      }
      return updatedBlocks;
    });
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const API_BASE_URL = 'https://api.winnode.xyz'; 
        const response = await fetch(`${API_BASE_URL}/api/validators`); 
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Network response was not ok: ${response.status} ${errorText}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setValidators(data);

          const uniqueChains = [...new Set(data.map(v => v.chain))];
          const initialBlocksData = {};
          uniqueChains.forEach(chain => {
            initialBlocksData[chain] = Array.from({ length: 28 }, (_, i) => ({ 
              id: `${chain}-initial-block-${i}`,
              height: Math.floor(Math.random() * 1000) + 12000 + i,
              isMissed: Math.random() < 0.1 
            }));
          });
          setBlocksByChain(initialBlocksData);

        } else {
          console.error("Received non-array data:", data);
          setValidators([]);
          if (data && data.error) {
            setError('Failed to fetch data: ' + data.error);
          } else {
            setError('Failed to fetch data: Invalid data format received.');
          }
        }
        setLastUpdated(new Date());
        if (!data.error) setError(null);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
        console.error(err); 
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const dataFetchInterval = setInterval(fetchData, 5 * 60 * 1000);
    const blockAnimationInterval = setInterval(animateBlocks, 1000);

    return () => {
      clearInterval(dataFetchInterval);
      clearInterval(blockAnimationInterval);
    };
  }, [animateBlocks]);

  const formatDate = (dateString) => {
    if (!dateString || dateString === "1970-01-01T00:00:00Z") return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined || num === 'N/A') return 'N/A';
    const numericValue = Number(num);
    if (isNaN(numericValue)) return 'N/A';
    return numericValue.toLocaleString('id-ID');
  };

  const formatTokenAmount = (amount, decimals, chainName = '') => {
    if (amount === null || amount === undefined || amount === 'N/A' || amount === '') return 'N/A';
    
    if (String(amount).trim() === '0') return '0';

    if (typeof decimals !== 'number' || decimals < 0) {
      return formatNumber(amount); 
    }

    try {
      const numericAmount = BigInt(String(amount).trim()); 
      const divisor = BigInt(10) ** BigInt(decimals);
      
      const wholePart = numericAmount / divisor;
      const fractionalPart = numericAmount % divisor;

      let formatted = wholePart.toLocaleString('id-ID');
      
      if (decimals > 0 && fractionalPart > BigInt(0)) {
        let fractionalString = fractionalPart.toString().padStart(decimals, '0');
        
        let displayFraction = fractionalString.substring(0, Math.min(fractionalString.length, 6));
        displayFraction = displayFraction.replace(/0+$/, '');

        if (displayFraction.length > 0) {
            if (displayFraction.length > 3) displayFraction = displayFraction.substring(0,3);
            formatted += '.' + displayFraction;
        } else if (wholePart === BigInt(0) && numericAmount > BigInt(0)) {
            formatted += '.' + fractionalString.substring(0, Math.min(fractionalString.length, 6)); 
        }
      }
      return formatted;
    } catch (error) {
      return formatNumber(amount);
    }
  };


  return (
    <div className="container">
      <h1 className="main-title">Validator Monitor</h1>
      
      {loading && <div className="loading-indicator">Loading validator data... <div className="spinner"></div></div>}
      {error && <div className="error-message">Error: {error}</div>}
      
      {!loading && !error && Array.isArray(validators) && validators.length > 0 && (
        <>
          <div className="validator-list">
            {validators.map((validator, index) => {
              const chainBlocks = blocksByChain[validator.chain] || [];
              const displayMoniker = "Winnode";

              return (
                <div 
                  key={validator.address + validator.chain_id || index} 
                  className={`validator-row ${validator.status && validator.status.toLowerCase().includes('jailed') ? 'jailed' : ''}`}
                  onClick={() => setSelectedValidator(validator)}
                >
                  <div className="validator-moniker-chain">
                    <span className="chain-name-display">{validator.chain}</span>
                  </div>
                  <div className="validator-status-details">
                    <div className="moniker-before-status">
                      <span className="moniker-label">Moniker : </span>
                      <span className="moniker-value">{displayMoniker}</span>
                    </div>
                    <p>Status: <span className={`status-badge ${getStatusClass(validator.status)}`}>{validator.status ? validator.status.replace('BOND_STATUS_', '') : 'N/A'}</span>
                    {validator.bonding_status && 
                      <span className="bond-status-inline"> Bond Status: <span className={`bond-status-badge bond-${validator.bonding_status.replace('BOND_STATUS_', '').toLowerCase()}`}>{validator.bonding_status.replace('BOND_STATUS_', '')}</span></span>
                    }
                    </p>
                    <p className="uptime-height-info">
                      Uptime: <span className={`uptime-badge ${getUptimeClass(validator.uptime)}`}>{typeof validator.uptime === 'number' ? validator.uptime.toFixed(2) + '%' : 'N/A'}</span>
                      <span className="info-separator">|</span>
                      Height: <span>{formatNumber(validator.block_height)}</span>
                    </p>
                  </div>
                  <div className="validator-last-event-and-blocks">
                    <small className="last-event-text">Last Event: {formatDate(validator.last_signed)}</small>
                    {chainBlocks.length > 0 && (
                      <div className="inline-blocks-display">
                        {chainBlocks.slice(-28).map(block => (
                          <div 
                            key={block.id} 
                            className={`block-box-inline ${block.isMissed ? 'missed' : ''}`}
                            title={`Block: ${block.height}${block.isMissed ? ' (Missed)' : ''}`}
                          >
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="last-updated-footer">
            Last updated: {lastUpdated.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short' })}
          </div>
        </>
      )}
      {!loading && !error && Array.isArray(validators) && validators.length === 0 && (
         <div className="no-validators-message">No validator data available.</div>
      )}

      {selectedValidator && 
        <ValidatorDetailPage validator={selectedValidator} onClose={() => setSelectedValidator(null)} />
      }
    </div>
  );
}

export default App;