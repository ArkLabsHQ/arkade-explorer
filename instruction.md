Scaffold a new SPA frontend application in the fashion of a modern blockchain explorer UI. Use typescript. Ensure there is hot reload available. Use env variable for the indexer url. Make reusable components.  
use api definition at https://github.com/arkade-os/arkd/blob/master/api-spec/openapi/swagger/ark/v1/indexer.openapi.json Use https://github.com/arkade-os/ts-sdk and specifically https://github.com/arkade-os/ts-sdk/blob/master/src/providers/indexer.ts for api consumption. Use https://github.com/paulmillr/scure-btc-signer https://github.com/paulmillr/scure-base and operations to decode data.  


Views: 

Transaction view /tx/{txid} redirect to /commitment-tx/{txid} if it is a commitment tx. : show relevant info
Address view /address/{addressOrScript} Show all vtxos associated to this address.

There are 2 transaction types: arkade and commitment transactions. one is spending vtxos and creating new ones, the other is an onchain tx that creates abtch output that creates a tree that creates vtxos. Learn at https://docs.arkadeos.com/ 

Theme: space invaders, retro theme. branding kit attached. Figure out colors from the COlor image folder somehow








