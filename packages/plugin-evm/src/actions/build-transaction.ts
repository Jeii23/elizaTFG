import { parseEther } from "viem";
import {
  type Action,
  composeContext,
  generateObjectDeprecated,
  type HandlerCallback,
  ModelClass,
  type IAgentRuntime,
  type Memory,
  type State,
} from "@elizaos/core";

import type { BuildParams } from "../types";
import { unsignedTxTemplate } from "../templates";

// Aquesta classe crea una transacció sense signar en format JSON.
export class CreateUnsignedTxAction {
  async createUnsignedTx(params: BuildParams): Promise<object> {
    // Convertim el valor (per exemple, la quantitat en ethers) a format hex
    const valueHex = "0x" + parseEther(params.amount || "1").toString(16);
    return {
      from: params.fromAddress || "0xElTeuCompte",
      to: params.toAddress || "0xReceptorAddress1234567890abcdef",
      value: valueHex,
    };
  }
}

const buildTransferDetails = async (
  state: State,
  runtime: IAgentRuntime
): Promise<BuildParams> => {
  // Componem el context per generar els paràmetres a partir d'una plantilla
  const context = composeContext({
    state,
    template: unsignedTxTemplate,
  });

  const transferDetails = (await generateObjectDeprecated({
    runtime,
    context,
    modelClass: ModelClass.SMALL,
  })) as BuildParams;

  // Obtenim EVM_PUBLIC_ADDRESS des de la configuració
  const envFromAddress = runtime.getSetting("EVM_PUBLIC_ADDRESS");
  if (envFromAddress) {
    if (envFromAddress.startsWith("0x")) {
      transferDetails.fromAddress = envFromAddress as `0x${string}`;
    } else {
      throw new Error("EVM_PUBLIC_ADDRESS must be a valid hex string starting with '0x'");
    }
  } else {
    // Si no hi ha valor, fem servir el que hi ha per defecte o el valor existent
    transferDetails.fromAddress = transferDetails.fromAddress || "0xElTeuCompte" as `0x${string}`;
  }

  return transferDetails;
};



export const createUnsignedTxAction: Action = {
  name: "createUnsignedTx",
  description:
    "Genera un JSON per una transacció no signada, amb els camps 'from', 'to' i 'value'",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback?: HandlerCallback
  ) => {
    state = state
      ? await runtime.updateRecentMessageState(state)
      : (await runtime.composeState(message)) as State;
    console.log("CreateUnsignedTx action handler called");

    // Obtenim els detalls de la transferència a partir del context de l'agent
    const params = await buildTransferDetails(state, runtime);
    const actionInstance = new CreateUnsignedTxAction();
    const unsignedTx = await actionInstance.createUnsignedTx(params);

    if (callback) {
      callback({
        text: "Transacció no signada generada correctament.",
        content: unsignedTx,
      });
    }
    return true;
  },
  validate: async (runtime: IAgentRuntime) => {
    // No es requereix cap clau privada ja que la transacció no es signa
    return true;
  },
  examples: [
    [
      {
        user: "assistant",
        content: {
          text: "Generating an unsigned transaction from 0xElTeuCompte to 0xReceptorAddress1234567890abcdef",
          action: "CREATE_UNSIGNED_TX",
        },
      },
      {
        user: "user",
        content: {
          text: "Create an unsigned transaction from 0xElTeuCompte to 0xReceptorAddress1234567890abcdef",
          action: "CREATE_UNSIGNED_TX",
        },
      },
    ],
  ],
  similes: ["CREATE_UNSIGNED_TX", "UNSIGNED_TRANSACTION", "TX_JSON"],
};
