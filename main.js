import algosdk from "algosdk";
import promptSync from "prompt-sync";
const prompt = promptSync();

const baseServer = "https://testnet-algorand.api.purestake.io/ps2";
const port = "";
const token = {
  "X-API-Key": "",
};

const algodClient = new algosdk.Algodv2(token, baseServer, port);
// create a testnet account with myalgowallet, keep the mmemonic key;
const mnemonic = "";
const recoveredAccount = algosdk.mnemonicToSecretKey(mnemonic);
const address = prompt("Enter escrow address: ");
const CHOICE_ASSET_ID = 21364625;
const option_one_address = "";
const option_zero_address = "";

const accountInfo = await algodClient
  .accountInformation(recoveredAccount.addr)
  .do();
const assets = accountInfo["assets"];

const validateEscrowWallet = (address) => {
  // compare the address to the address gotten from the mnemonic
  if (recoveredAccount.addr != address) {
    console.log("Invalid wallet address");
    return false;
  } else {
    //Check if choice coin is opted in
    if (assets.length > 0) {
      assets.map((asset) => {
        if (asset["asset-id"] != CHOICE_ASSET_ID) {
          console.log("Choice coin asset is not found, opt in choice coin ASA");
          return false;
        }
        //Check if it has sufficient funds
        else {
          const amount = asset["amount"];
          const choiceAmount = amount / 100;
          if (choiceAmount < 1000) return false;
        }
      });
    } else {
      console.log("No asset added yet, opt in choice coin ASA");
      return false;
    }
  }
  return true;
};

const getBalance = async () => {
  //get the account information
  //Checks if the address is opted into Choice Coin and get choice amount from assets after voting
  assets.map((asset) => {
    if (asset["asset-id"] === CHOICE_ASSET_ID) {
      const amount = asset["amount"];
      const choiceAmount = amount / 100;
      console.log(
        `Account ${recoveredAccount.addr} has ${choiceAmount} $choice`
      );
      return choiceAmount;
    } else {
      console.log(
        `Account ${recoveredAccount.addr} must opt in to Choice Coin Asset ID ${CHOICE_ASSET_ID}`
      );
    }
  });
};

const vote = async (option_zero_address, option_one_address) => {
  const params = await algodClient.getTransactionParams().do();
  const encoder = new TextEncoder();
  // Places a vote based on the input of the user.
  const votingOption = prompt("Vote 0 for zero and vote 1 for one: ");
  const amount = prompt("Please enter Amount to commit to voting:");

  if (votingOption == "1") {
    try {
      let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        recoveredAccount.addr,
        option_one_address,
        undefined,
        undefined,
        amount * 100,
        encoder.encode("Voting powered by Choice Coin"),
        CHOICE_ASSET_ID,
        params
      );

      let signedTxn = txn.signTxn(recoveredAccount.sk);
      const response = await algodClient.sendRawTransaction(signedTxn).do();
      if (response) {
        console.log(
          `Thanks for voting for one,Your voting ID: ${response.txId}`
        );
        // wait for confirmation
        waitForConfirmation(algodClient, response.txId);
      } else {
        console.log("error voting for one, try again later");
      }
    } catch (error) {
      console.log("error voting for one, Try again later");
    }
  } else if (votingOption == "0") {
    try {
      let txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
        recoveredAccount.addr,
        option_zero_address,
        undefined,
        undefined,
        amount * 100,
        encoder.encode("Voting powered by Choice Coin"),
        CHOICE_ASSET_ID,
        params
      );

      let signedTxn = txn.signTxn(recoveredAccount.sk);
      const response = await algodClient.sendRawTransaction(signedTxn).do();
      if (response) {
        console.log(
          `Thanks for voting for zero,Your voting ID: ${response.txId}`
        );
        // wait for confirmation
        waitForConfirmation(algodClient, response.txId);
      } else {
        console.log("error voting for  Zero, try again later");
      }
    } catch (error) {
      console.log("error voting for  Zero, Try again later");
    }
  } else {
    console.log("Please select a valid option");
  }
};

//verification function
const waitForConfirmation = async (algodClient, txId) => {
  let lastround = (await algodClient.status().do())["last-round"];
  while (true) {
    const pendingInfo = await algodClient
      .pendingTransactionInformation(txId)
      .do();
    if (
      pendingInfo["confirmed-round"] !== null &&
      pendingInfo["confirmed-round"] > 0
    ) {
      //Got the completed Transaction
      console.log(
        "Voting confirmed in round " + pendingInfo["confirmed-round"]
      );
      break;
    }
    lastround++;
    await algodClient.statusAfterBlock(lastround).do();
  }
};

const calculateVotes = async (addresses) => {
  // Calculate the result of a voting process.
  const results = [];
  for (var i = 0; i < addresses.length; i++) {
    const optionAccountInfo = await algodClient
      .accountInformation(addresses[i])
      .do();
    //get the account information
    const assets = optionAccountInfo["assets"];

    //Check if choice coin is opted in
    assets.map((asset) => {
      if (asset["asset-id"] != CHOICE_ASSET_ID) return false;
      else {
        const amount = asset["amount"];
        const choiceAmount = amount / 100;
        results.push(choiceAmount);
      }
    });
  }
  console.log(results);
  return results;
};

const winner = (option_zero_count, option_one_count) => {
  // Selects a winner based on the result.
  if (option_zero_count > option_one_count) console.log("Option zero wins.");
  else if (option_zero_count < option_one_count)
    console.log("Option one wins.");
};

const main = async () => {
  // Entrypoint for the application
  const is_valid = validateEscrowWallet(address);
  if (!is_valid) console.log("Wallet does not meet the requirements.");
  else {
    vote(option_zero_address, option_one_address);
  }
};

main();
//A block takes approximately 3-4 seconds to be added to the blockchain. So, a delay is added to the to account for the synchronization. The delay function is described below:

await new Promise((r) => setTimeout(r, 30000));
getBalance();
const results = calculateVotes([option_one_address, option_zero_address]);
winner(results[0], results[1]);
