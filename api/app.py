from flask import Flask, jsonify
import requests
from datetime import datetime, timezone
import logging
from flask_cors import CORS
from bech32 import bech32_decode, bech32_encode, convertbits
import re

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "*"}})

logging.basicConfig(level=logging.INFO)

CHAIN_CONFIG = {
    "Selfchain": {
        "api": "https://selfchain.api.m.stavr.tech",
        "rpc": "https://selfchain.rpc.m.stavr.tech",
        "decimals": 18
    },
    "Warden": {
        "api": "https://warden-testnet-api.itrocket.net",
        "rpc": "https://warden-testnet-rpc.itrocket.net",
        "decimals": 18
    },
    "Lumera": {
        "api": "https://lumera-testnet-api.polkachu.com",
        "rpc": "https://lumera-testnet-rpc.polkachu.com",
        "decimals": 6
    },
    "Kiichain": {
        "api": "https://lcd.dos.sentry.testnet.v3.kiivalidator.com",
        "rpc": "https://rpc.dos.sentry.testnet.v3.kiivalidator.com",
        "decimals": 6
    },
    "Pellchain": {
        "api": "https://pell-testnet-api.itrocket.net",
        "rpc": "https://pell-testnet-rpc.itrocket.net",
        "decimals": 6
    },
    "Emperia": {
        "api": "https://empe-testnet-api.mictonode.com",
        "rpc": "https://empeiria-testnet-rpc.itrocket.net",
        "decimals": 6
    },
    "Galactica": {
        "api": "https://galactica-testnet-api.itrocket.net",
        "rpc": "https://galactica-testnet-rpc.itrocket.net",
        "decimals": 18
    },
    "Zenrock": {
        "api": "https://zenrock-mainnet-api.itrocket.net",
        "rpc": "https://zenrock-mainnet-rpc.itrocket.net",
        "decimals": 6
    },
    "Story": {
        "api": "https://api-story-testnet.itrocket.net",
        "rpc": "https://story-testnet-rpc.itrocket.net",
        "decimals": 18
    }
}

if "api-lumera.winnode.xyz" in CHAIN_CONFIG["Lumera"]["rpc"]:
    CHAIN_CONFIG["Lumera"]["api"] = CHAIN_CONFIG["Lumera"]["rpc"].replace("/rpc", "")

VALIDATORS = [
    {
        "cons_address": "selfvalcons16x875m6tg7ykugwjj0rfry9mpc9k8r8u5k6cn8",
        "valoper_address": "selfvaloper1dh6fukc87paguve8fg2w4v8rud67xd3q6wtxx7",
        "moniker": "Winnode",
        "chain": "Selfchain",
        "chain_id": "self-1"
    },
    {
        "cons_address": "wardenvalcons1avr3wlefz9y3nkksyte02uwz0r9veejgvxe9gq",
        "valoper_address": "warden15pwxz5surmcvnghc9az0ynj8x27lghvj0e6v6v",
        "moniker": "WHTech",
        "chain": "Warden",
        "chain_id": "chiado_10010-1"
    },
    {
        "cons_address": "lumeravalcons1wqygedjx7z28kaytrdv2pcgp4cufdjqws4knvv",
        "valoper_address": "lumera1cuqlf6y6uxqcehewur4zw5vc6p77wdf85svuza",
        "moniker": "WHTech",
        "chain": "Lumera",
        "chain_id": "lumera-testnet-1"
    },
    {
        "cons_address": "kiivalcons160zcz56leacwpwnss84u8qx5h3wmsklllwk4qy",
        "valoper_address": "kiivaloper1zlnexclwk2r0fpur45akfyyjwmsf2m34p8l038",
        "moniker": "Winnode",
        "chain": "Kiichain",
        "chain_id": "oro_1336-1"
    },
    {
        "cons_address": "pellvalcons14hwcrz2e2etugyz9w4u8un5srj2qhgxmjr2s0c",
        "valoper_address": "pellvaloper1epu23sr6my9el9muwrjxnewvwpdct23hxlvgkl",
        "moniker": "Winnode",
        "chain": "Pellchain",
        "chain_id": "ignite_186-1"
    },
    {
        "cons_address": "empevalcons18dz8sjfajuy9jxmk7tlvv5fuwczaxc22vnejp5",
        "valoper_address": "empevaloper1xvyxsc26kv2ct6x5khs3yggah09lleg6erdw9v",
        "moniker": "Winnode",
        "chain": "Emperia",
        "chain_id": "empe-testnet-2"
    },
    {
        "cons_address": "galavalcons1el3e28x6az5mqfv9u242nfjdzuj8u9a6q4h4yy",
        "valoper_address": "galavaloper104v3j5wxsppqnftxjs2k37h6qs684ywgf0unq3",
        "moniker": "Winnode",
        "chain": "Galactica",
        "chain_id": "galactica_9302-1"
    },
    {
        "cons_address": "zenvalcons138xthfsun24shhx9vd2dvrpuzee0y9ha8x5pr7",
        "valoper_address": "zenvaloper1hrq3p9hatskmyju8ga0z0rfkvdw42mrvq5pe5a",
        "moniker": "Winnode",
        "chain": "Zenrock",
        "chain_id": "diamond-1"
    },
    {
        "cons_address": "storyvalcons1kyrksn278n309h05jhnlxlk9a4gyzjmwyh0jep",
        "valoper_address": "story17dnr54jlqj0rt7mfmf9zln7ynwhccgadygu3pn",
        "moniker": "WHTech",
        "chain": "Story",
        "chain_id": "aeneid"
    },
    {
        "cons_address": "storyvalcons190frhcrd5f358sg5tumx7alawvncflr83hgl5y",
        "valoper_address": "story10emfpa3hcqg275xate2e4pxnyuaasn62u0uut0",
        "moniker": "Technocrypt",
        "chain": "Story",
        "chain_id": "aeneid"
    }
]

def get_acc_address_from_valoper(valoper_address):
    try:
        hrp, data = bech32_decode(valoper_address)
        if hrp is None or data is None:
            return None
        acc_hrp = hrp.replace('valoper', '')
        if not acc_hrp or acc_hrp == hrp:
            chain_prefix_map = {
                'self': 'self',
                'warden': 'warden',
                'lumera': 'lumera',
                'kiival': 'kiival',
                'pell': 'pell',
                'empe': 'empe',
                'gala': 'gala',
                'zen': 'zen',
                'story': 'story'
            }
            match = re.match(r"([a-zA-Z0-9]+?)1", valoper_address)
            if match:
                extracted_prefix = match.group(1).replace('valoper', '')
                if extracted_prefix in chain_prefix_map.values():
                    acc_hrp = extracted_prefix
                else:
                    acc_hrp = extracted_prefix if extracted_prefix else hrp
            else:
                 app.logger.warning(f"Cannot determine account HRP for {valoper_address} from valoper prefix.")
                 return None
        
        acc_address = bech32_encode(acc_hrp, data)
        return acc_address
    except Exception as e:
        app.logger.error(f"Error converting valoper to acc address for {valoper_address}: {e}")
        return None

def get_validator_info(cons_address, valoper_address_from_config, chain_name, chain_id_from_config):
    signing_info_data = {}
    staking_info_data = {}
    delegations_data = {}
    self_delegation_data = {}

    config = CHAIN_CONFIG.get(chain_name)
    if not config or not config.get("api"):
        app.logger.error(f"Missing API configuration for chain: {chain_name}")
        return {
            "error": f"Missing API configuration for chain: {chain_name}", "status": "Unknown", "uptime": 0,
            "block_height": 0, "last_signed": None, "missed_blocks": 0,
            "total_blocks": 0, "bonding_status": "N/A", "commission": "N/A",
            "current_bonded_tokens": "N/A", "max_commission_rate": "N/A", "max_change_rate": "N/A",
            "consensus_pubkey": "N/A", "voting_power": "N/A", "delegators_count": "N/A", "rank": "N/A",
            "self_bonded_tokens": "N/A", "all_time_uptime": "N/A", "evm_address": "N/A", "hex_address": "N/A",
            "decimals": 0
        }

    base_api_url = config["api"]
    chain_decimals = config.get("decimals", 0)

    signing_endpoint = f"{base_api_url}/cosmos/slashing/v1beta1/signing_infos/{cons_address}"
    try:
        response_signing = requests.get(signing_endpoint, timeout=10)
        response_signing.raise_for_status()
        signing_info_data = response_signing.json().get("val_signing_info", {})
    except requests.exceptions.RequestException as e:
        app.logger.warning(f"Failed to get signing info for {cons_address} on {chain_name} from {signing_endpoint}: {str(e)}")

    address_for_staking_query = valoper_address_from_config if valoper_address_from_config and valoper_address_from_config != "YOUR_VALOPER_ADDRESS_HERE" else cons_address
    staking_endpoint = f"{base_api_url}/cosmos/staking/v1beta1/validators/{address_for_staking_query}"
    app.logger.info(f"Fetching info for {valoper_address_from_config} on {chain_name}")

    staking_endpoint = f"{base_api_url}/cosmos/staking/v1beta1/validators/{address_for_staking_query}"
    app.logger.info(f"Staking endpoint: {staking_endpoint}")
    try:
        response_staking = requests.get(staking_endpoint, timeout=10)
        response_staking.raise_for_status()
        staking_info_data = response_staking.json().get("validator", {})
        app.logger.info(f"Staking info data for {valoper_address_from_config}: {staking_info_data.get('tokens', 'N/A')}")
    except requests.exceptions.RequestException as e:
        app.logger.warning(f"Failed to get staking info for {address_for_staking_query} on {chain_name} from {staking_endpoint}: {str(e)}")
        staking_info_data = {}
    except ValueError:
        app.logger.warning(f"Failed to parse staking info JSON for {address_for_staking_query} on {chain_name}")
        staking_info_data = {}

    current_bonded_val = staking_info_data.get("tokens", "N/A")

    delegators_count_val = "N/A"
    if valoper_address_from_config and valoper_address_from_config != "YOUR_VALOPER_ADDRESS_HERE":
        delegations_endpoint = f"{base_api_url}/cosmos/staking/v1beta1/validators/{valoper_address_from_config}/delegations?pagination.count_total=true"
        try:
            response_delegations = requests.get(delegations_endpoint, timeout=10)
            response_delegations.raise_for_status()
            delegations_data = response_delegations.json()
            delegators_count_val = int(delegations_data.get("pagination", {}).get("total", 0))
        except requests.exceptions.RequestException as e:
            app.logger.warning(f"Failed to get delegations for {valoper_address_from_config} on {chain_name} from {delegations_endpoint}: {str(e)}")
        except ValueError:
            app.logger.warning(f"Could not parse delegators_count from {delegations_data}")
            delegators_count_val = "N/A"

    self_bonded_tokens_val = "N/A"
    acc_address_for_self_bond = get_acc_address_from_valoper(valoper_address_from_config)
    if acc_address_for_self_bond and valoper_address_from_config != "YOUR_VALOPER_ADDRESS_HERE":
        self_delegation_endpoint = f"{base_api_url}/cosmos/staking/v1beta1/delegations/{acc_address_for_self_bond}"
        try:
            response_self_delegation = requests.get(self_delegation_endpoint, timeout=10)
            response_self_delegation.raise_for_status()
            self_delegation_data_full = response_self_delegation.json()
            for delegation_response in self_delegation_data_full.get("delegation_responses", []):
                if delegation_response.get("delegation", {}).get("validator_address") == valoper_address_from_config:
                    self_bonded_tokens_val = delegation_response.get("balance", {}).get("amount", "N/A")
                    if self_bonded_tokens_val != "N/A":
                        try: self_bonded_tokens_val = f"{int(self_bonded_tokens_val) / 1000000:.2f}M"
                        except: pass
                    break
        except requests.exceptions.RequestException as e:
            app.logger.warning(f"Failed to get self-delegation for {acc_address_for_self_bond} on {chain_name} from {self_delegation_endpoint}: {str(e)}")

    missed_blocks = int(signing_info_data.get("missed_blocks_counter", 0))
    try:
        index_offset_val = signing_info_data.get("index_offset", "0")
        signed_blocks = int(index_offset_val) if index_offset_val else 0
    except ValueError:
        signed_blocks = 0
        app.logger.warning(f"Could not parse index_offset: {signing_info_data.get('index_offset')}")
        
    total_relevant_blocks = signed_blocks + missed_blocks
    uptime_val = (signed_blocks / total_relevant_blocks * 100) if total_relevant_blocks > 0 else 0
    current_block_height_validator = int(signing_info_data.get("start_height", 0)) + signed_blocks

    jailed_until_str = signing_info_data.get("jailed_until")
    status_from_signing = "Active"
    if jailed_until_str:
        try:
            jailed_until_dt = datetime.fromisoformat(jailed_until_str.replace('Z', '+00:00'))
            if jailed_until_dt > datetime.now(timezone.utc):
                status_from_signing = "Jailed"
        except ValueError:
            app.logger.warning(f"Could not parse jailed_until_str: {jailed_until_str}")

    moniker_val = staking_info_data.get("description", {}).get("moniker", "N/A")
    operator_address_val = staking_info_data.get("operator_address", address_for_staking_query)
    consensus_pubkey_val = staking_info_data.get("consensus_pubkey", {}).get("key", "N/A")
    is_jailed_staking = staking_info_data.get("jailed", False)
    bonding_status_raw = staking_info_data.get("status", "BOND_STATUS_UNSPECIFIED")
    tokens_bonded_str = staking_info_data.get("tokens", "0")
    try:
        tokens_bonded_int = int(tokens_bonded_str)
        current_bonded_tokens_val = f"{tokens_bonded_int / 1000000:.2f}M" if tokens_bonded_int > 1000000 else str(tokens_bonded_int)
        voting_power_val = current_bonded_tokens_val
    except ValueError:
        tokens_bonded_int = 0
        current_bonded_tokens_val = "N/A"
        voting_power_val = "N/A"
        app.logger.warning(f"Could not parse tokens_bonded: {tokens_bonded_str}")

    commission_rates = staking_info_data.get("commission", {}).get("commission_rates", {})
    commission_rate_val = commission_rates.get("rate", "N/A")
    max_commission_rate_val = commission_rates.get("max_rate", "N/A")
    max_change_rate_val = commission_rates.get("max_change_rate", "N/A")
    
    final_status = status_from_signing
    if is_jailed_staking:
        final_status = "Jailed"
    elif bonding_status_raw != 'BOND_STATUS_BONDED' and final_status == 'Active':
        if bonding_status_raw == 'BOND_STATUS_UNBONDING': final_status = 'Unbonding'
        elif bonding_status_raw == 'BOND_STATUS_UNBONDED': final_status = 'Unbonded'
        else: final_status = bonding_status_raw.replace('BOND_STATUS_', '')

    return {
        "address": operator_address_val,
        "valoper_address": valoper_address_from_config,
        "cons_address": cons_address,
        "moniker": moniker_val,
        "chain": chain_name,
        "chain_id": chain_id_from_config,
        "status": final_status,
        "uptime": uptime_val,
        "block_height": current_block_height_validator,
        "last_signed": signing_info_data.get("tombstoned_at", signing_info_data.get("jailed_until", "1970-01-01T00:00:00Z")),
        "missed_blocks": missed_blocks,
        "total_blocks": total_relevant_blocks,
        "bonding_status": bonding_status_raw.replace('BOND_STATUS_', ''),
        "commission": commission_rate_val,
        "current_bonded_tokens": current_bonded_tokens_val,
        "max_commission_rate": max_commission_rate_val,
        "max_change_rate": max_change_rate_val,
        "consensus_pubkey": consensus_pubkey_val,
        "voting_power": voting_power_val,
        "delegators_count": delegators_count_val,
        "rank": "N/A",
        "self_bonded_tokens": self_bonded_tokens_val,
        "all_time_uptime": "N/A",
        "evm_address": "N/A",
        "hex_address": "N/A"
    }

@app.route('/api/validators', methods=['GET'])
def get_all_validators_info():
    all_validators_data = []
    for val_config in VALIDATORS:
        try:
            info = get_validator_info(
                val_config["cons_address"],
                val_config["valoper_address"],
                val_config["chain"],
                val_config["chain_id"]
            )
            all_validators_data.append(info)
        except Exception as e:
            app.logger.error(f"Error processing validator {val_config.get('moniker', 'N/A')} on chain {val_config.get('chain', 'N/A')}: {e}")
            all_validators_data.append({
                "error": f"Failed to process validator {val_config.get('moniker', 'N/A')}",
                "moniker": val_config.get('moniker', 'N/A'),
                "chain": val_config.get('chain', 'N/A'),
                "status": "ErrorFetchingData"
            })
    
    return jsonify(all_validators_data)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
