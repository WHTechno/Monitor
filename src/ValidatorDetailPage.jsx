import React, { useState } from 'react';
import './ValidatorDetailPage.css';

const formatDate = (dateString) => {
  if (!dateString || dateString === "1970-01-01T00:00:00Z") return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'
  });
};

const formatNumber = (num, decimals = 0) => {
  if (typeof num !== 'number' && (typeof num !== 'string' || isNaN(parseFloat(num)))) return 'N/A';
  const numericValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numericValue)) return 'N/A';
  return numericValue.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const getStatusClass = (status) => {
  if (!status) return 'status-unknown';
  const lowerStatus = status.toLowerCase();
  if (lowerStatus.includes('active') || lowerStatus.includes('bonded')) return 'status-active';
  if (lowerStatus.includes('jailed')) return 'status-jailed';
  if (lowerStatus.includes('unbonding')) return 'status-unbonding';
  if (lowerStatus.includes('unbonded')) return 'status-unbonded';
  return 'status-unknown';
};

const UptimeVisualizer = ({ uptime }) => {
  const blocks = 50; 
  const goodBlocks = Math.round((uptime / 100) * blocks);
  
  return (
    <div className="uptime-visualizer">
      {Array.from({ length: blocks }).map((_, i) => (
        <div key={i} className={`uptime-block ${i < goodBlocks ? 'good' : 'bad'}`}></div>
      ))}
    </div>
  );
};

const ValidatorDetailPage = ({ validator, onClose }) => {
  const [copiedAddress, setCopiedAddress] = useState(''); 
  const [copyFeedback, setCopyFeedback] = useState(''); 

  if (!validator) return null;

  const handleCopy = async (textToCopy, addressType) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedAddress(textToCopy);
      setCopyFeedback(`Alamat ${addressType} disalin!`);
      setTimeout(() => {
        setCopiedAddress('');
        setCopyFeedback('');
      }, 2000); 
    } catch (err) {
      console.error('Gagal menyalin teks: ', err);
      setCopyFeedback(`Gagal menyalin.`);
      setTimeout(() => setCopyFeedback(''), 2000);
    }
  };

  const votingPower = validator.voting_power && typeof validator.voting_power === 'string' && validator.voting_power.includes('%') ? parseFloat(validator.voting_power) : (typeof validator.voting_power === 'number' ? validator.voting_power : 0);
  const currentBondedTokens = validator.current_bonded_tokens || 'N/A';
  const delegators = validator.delegators_count || 'N/A';
  const validatorRank = validator.rank || 'N/A';

  let selfBondedDisplay = 'N/A';
  if (validator.self_bonded_tokens && validator.self_bonded_tokens !== 'N/A'){
    if (validator.self_bonded_tokens.toString().toLowerCase().includes('token')){
        selfBondedDisplay = validator.self_bonded_tokens;
    } else {
        const selfBondedNum = parseFloat(validator.self_bonded_tokens);
        if (!isNaN(selfBondedNum)){
            selfBondedDisplay = formatNumber(selfBondedNum / 1000000, 3) + ' TOKEN';
        } else {
            selfBondedDisplay = validator.self_bonded_tokens;
        }
    }
  } else if (validator.self_bonded_tokens === "0.000"){
    selfBondedDisplay = "0.000 TOKEN";
  }

  const commissionRate = validator.commission && !isNaN(parseFloat(validator.commission)) ? (parseFloat(validator.commission) * 100).toFixed(0) + '%' : 'N/A';
  const maxCommissionRate = validator.max_commission_rate && !isNaN(parseFloat(validator.max_commission_rate)) ? (parseFloat(validator.max_commission_rate) * 100).toFixed(0) + '%' : 'N/A';
  const maxChangeRate = validator.max_change_rate && !isNaN(parseFloat(validator.max_change_rate)) ? (parseFloat(validator.max_change_rate) * 100).toFixed(0) + '%' : 'N/A';
  const allTimeUptime = validator.all_time_uptime && typeof validator.all_time_uptime === 'number' ? validator.all_time_uptime.toFixed(2) + '%' : 'N/A';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="validator-detail-page modal-content" onClick={(e) => e.stopPropagation()}>
        {}
        <button className="modal-close-button" onClick={onClose} aria-label="Tutup Detail">
          &times;
        </button>
        
        <h2 className="validator-moniker">
          <span>{validator.moniker || 'Unknown Moniker'}</span>
          <span className="chain-badge">{validator.chain}</span>
        </h2>
        
        <div className="detail-grid">
          <div className="detail-card voting-power-card">
            <h3>{currentBondedTokens !== 'N/A' ? currentBondedTokens : '0'} <span className="token-name">{(validator.chain && validator.chain.toUpperCase()) || 'TOKEN'}</span></h3>
            <p className="card-subtitle">Current Bonded Tokens</p>
            <div className="voting-power-gauge">
              <div className="gauge-bar" style={{ width: `${votingPower}%` }}></div> 
            </div>
            <p>{formatNumber(votingPower, 2)}% Voting Power</p>
          </div>

          <div className="detail-card addresses-card">
            <h4>Addresses</h4>
            {copyFeedback && <p className="copy-feedback">{copyFeedback}</p>} {} 
            <p>
              <strong>Address (Valoper):</strong>
              <span className="address-value">{validator.address || 'N/A'}</span>
              {validator.address && (
                <button 
                  onClick={() => handleCopy(validator.address, 'Valoper')}
                  className="copy-button"
                  aria-label="Salin alamat valoper"
                  title="Salin alamat valoper"
                >
                  {copiedAddress === validator.address ? 'Copy!' : 'Copy'}
                  {}
                </button>
              )}
            </p>
            {validator.cons_address && validator.cons_address !== validator.address && (
              <p>
                <strong>Consensus Addr:</strong>
                <span className="address-value">{validator.cons_address}</span>
                <button 
                  onClick={() => handleCopy(validator.cons_address, 'Consensus')}
                  className="copy-button"
                  aria-label="Salin alamat consensus"
                  title="Salin alamat consensus"
                >
                  {copiedAddress === validator.cons_address ? 'Copy!' : 'Copy'}
                </button>
              </p>
            )}
            {validator.evm_address && validator.evm_address !== 'N/A' && <p><strong>EVM:</strong> <span>{validator.evm_address}</span></p>}
            {validator.consensus_pubkey && validator.consensus_pubkey !== 'N/A' && <p><strong>Consensus Pubkey:</strong> <span>{validator.consensus_pubkey}</span></p>}
            {validator.hex_address && validator.hex_address !== 'N/A' && <p><strong>HEX Address:</strong> <span>{validator.hex_address}</span></p>}
          </div>

          <div className="detail-card staking-info-card">
            <div className="info-item">
              <span className="info-label">Delegators</span>
              <span className="info-value">{delegators}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Validator Rank</span>
              <span className="info-value">{validatorRank}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Self-bonded</span>
              <span className="info-value">{selfBondedDisplay}</span>
            </div>
             <div className="info-item">
              <span className="info-label">Status</span>
              <span className={`info-value status-badge ${getStatusClass(validator.status)}`}>{validator.status ? validator.status.replace('BOND_STATUS_', '') : 'N/A'}</span>
            </div>
          </div>

          <div className="detail-card commission-card">
            <h4>Commission</h4>
            <p className="commission-value">{commissionRate}</p>
            <div className="info-item">
              <span className="info-label">Max Rate</span>
              <span className="info-value">{maxCommissionRate}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Max Change Rate</span>
              <span className="info-value">{maxChangeRate}</span>
            </div>
          </div>

          <div className="detail-card uptime-card">
            <h4>Uptime (Current Window)</h4>
            <p className="uptime-value">{typeof validator.uptime === 'number' ? validator.uptime.toFixed(2) + '%' : 'N/A'}</p>
            {typeof validator.uptime === 'number' && <UptimeVisualizer uptime={validator.uptime} />}            
            <div className="info-item">
              <span className="info-label">All Time Uptime</span>
              <span className="info-value">{allTimeUptime}</span>
            </div>
            <p><small>Missed Blocks: {formatNumber(validator.missed_blocks)} / {formatNumber(validator.total_blocks)}</small></p>
            <p><small>Last Event: {formatDate(validator.last_signed)}</small></p>
            {validator.error && <p className="error-text-detail">Error fetching details: {validator.error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const MAX_BLOCKS_DISPLAYED = 30;

function ValidatorBlockDisplay({ validatorAddress }) {
  const [blocks, setBlocks] = useState([]);
  const [error, setError] = useState(null);

  const fetchLatestBlock = useCallback(async () => {
    try {
      const response = await fetch(`/api/realtime_block_status?validator_address=${validatorAddress}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newBlock = await response.json();
      
      setBlocks(prevBlocks => {
        const updatedBlocks = [newBlock, ...prevBlocks];
        return updatedBlocks.slice(0, MAX_BLOCKS_DISPLAYED);
      });
      setError(null);
    } catch (e) {
      console.error("Failed to fetch latest block:", e);
      setError('Failed to load block data.');
    }
  }, [validatorAddress]);

  useEffect(() => {
    if (!validatorAddress) return;

    fetchLatestBlock();

    const intervalId = setInterval(fetchLatestBlock, 1000);

    return () => clearInterval(intervalId);
  }, [validatorAddress, fetchLatestBlock]);

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="inline-blocks-display">
      {blocks.map((block, index) => (
        <div 
          key={`${block.height}-${index}`}
          className={`block-box-inline ${block.is_missed ? 'missed' : ''}`}
          title={`Height: ${block.height} - ${block.is_missed ? 'Missed' : 'Success'}`}
        ></div>
      ))}
      {blocks.length === 0 && <p>Waiting for block data...</p>}
    </div>
  );
}

export default ValidatorDetailPage;