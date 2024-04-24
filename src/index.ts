import { initializeKeypair } from "./initializeKeypair"

import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js"

import {
  Metaplex,
  keypairIdentity,
  bundlrStorage,
  toMetaplexFile,
  NftWithToken,
  Signer,
} from "@metaplex-foundation/js"

import * as fs from "fs"

interface NftData {
  name: string
  symbol: string
  description: string
  sellerFeeBasisPoints: number
  imageFile: string
}

interface CollectionNftData {
  name: string
  symbol: string
  description: string
  sellerFeeBasisPoints: number
  imageFile: string
  isCollection: boolean
  collectionAuthority: Signer
}

// dados de exemplo para um novo NFT
const nftData = {
  name: "THE WEB3 BLACK PEARL COIN",
  symbol: "$BPC",
  description: "The currency of the greatest Pirate in this new and little explored Ocean called Web3",
  sellerFeeBasisPoints: 100,
  imageFile: "pirate_coin.png",
}

/*

// dados de exemplo para atualizar um NFT existente
const updateNftData = {
  name: "THE WEB3 BLACK PEARL COIN",
  symbol: "$BPC",
  description: "The currency of the greatest Pirate in this new and little explored Ocean called Web3",
  sellerFeeBasisPoints: 100,
  imageFile: "pirate_coin.png",
}

*/



// PASSO 2 - CARREGAR ARQUIVOS E METADADOS

// função auxiliar para fazer upload de imagem e metadados
async function uploadMetadata(
  // metaplex client
  metaplex: Metaplex,
  // dados do NFT
  nftData: NftData,

): Promise<string> {

  // Arquivo para buffer
  const buffer = fs.readFileSync("src/" + nftData.imageFile);

  // Buffer para arquivo metaplex
  const file = toMetaplexFile(buffer, nftData.imageFile);

  // carrega a imagem e obtém o uri da imagem
  const imageUri = await metaplex.storage().upload(file);
  
  console.log("uri da imagem:", imageUri);

  // carrega metadados e obtém uri de metadados (metadados off chain)
  const { uri } = await metaplex.nfts().uploadMetadata({
    name: nftData.name,
    symbol: nftData.symbol,
    description: nftData.description,
    image: imageUri,
  });

  console.log("uri de metadados:", uri);

  return uri;

}

// PASSO 3 - CRIAR NFT

// Função auxiliar para criar NFT
async function createNFT(
  metaplex: Metaplex,
  uri: string,
  nftData: NftData,
  collectionMint: PublicKey
): Promise<NftWithToken> {
  
  const {nft} = await metaplex.nfts().create(
    {
      uri: uri, // URI de Metadados
      name: nftData.name,
      sellerFeeBasisPoints: nftData.sellerFeeBasisPoints,
      symbol: nftData.symbol,
      collection: collectionMint
    },

    {commitment: "finalized"},
  );

  console.log(
    `Token Cunhado: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`
  );

  // 6. ATRIBUIR NFT A UMA COLEÇÃO

  // isto é o que verifica a nossa coleção como uma Coleção Certificada
  await metaplex.nfts().verifyCollection({
    mintAddress: nft.address,
    collectionMintAddress: collectionMint,
    isSizedCollection: true,
  })

  return nft;
}

/*
// PASSO 4 - ATUALIZAR NFT

// Função auxiliar para atualizar NFT

async function updateNftUri(
  metaplex: Metaplex,
  uri: string,
  mintAddress: PublicKey,
) {
  // fetch NFT data using mint address
  const nft = await metaplex.nfts().findByMint({ mintAddress });

  // update the NFT metadata
  const { response } = await metaplex.nfts().update(
    {
      nftOrSft: nft,
      uri: uri,
    },
    { commitment: "finalized" },
  );

  console.log(
    `Token Mint: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`,
  );

  console.log(
    `Transaction: https://explorer.solana.com/tx/${response.signature}?cluster=devnet`,
  );
}
*/

// PASSO 5 - CRIAR UMA COLEÇÃO NFT
async function createCollectionNft(
  metaplex: Metaplex,
  uri: string,
  data: CollectionNftData
): Promise<NftWithToken> {

  const { nft } = await metaplex.nfts().create(
    {
      uri: uri,
      name: data.name,
      sellerFeeBasisPoints: data.sellerFeeBasisPoints,
      symbol: data.symbol,
      isCollection: true,
    },
    
    { commitment: "finalized" }
  
  )

  console.log(`Coleção Cunhada: https://explorer.solana.com/address/${nft.address.toString()}?cluster=devnet`);

  return nft;
  
}

async function main() {

  // cria uma nova conexão com a API do cluster
  const connection = new Connection(clusterApiUrl("devnet"))

  // inicializa um par de chaves para o usuário
  const user = await initializeKeypair(connection)

  console.log("PublicKey:", user.publicKey.toBase58())

  // PASSO 1 - CONFIGURE INSTÂNCIA METAPLEX
  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(user))
    .use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: "https://api.devnet.solana.com",
        timeout: 60000,
      }),
    );

    // 5.1 DADOS DA COLEÇÃO NFT
    const collectionNftData = {
      name: "Web3 Pirates",
      symbol: "W3P",
      description: "Collection about the bravest and most daring pirate explorers of this new Ocean called Web3",
      sellerFeeBasisPoints: 100,
      imageFile: "web3_pirates.png",
      isCollection: true,
      collectionAuthority: user,
    }

    // 5.2 - faz upload dos dados para a coleção NFT e obtém o URI dos metadados
    const collectionUri = await uploadMetadata(metaplex, collectionNftData);

    // 5.3 - cria a coleção NFT usando a função auxiliar e o URI dos metadados
    const collectionNft = await createCollectionNft(
      metaplex, 
      collectionUri,
      collectionNftData
    )

    // 2.1 CHAMANDO A FUNÇÃO uploadMetadata

    // carrega os dados NFT e obtém o URI dos metadados
    const uri = await uploadMetadata(metaplex, nftData);

    // 3.1 CHAMANDO A FUNÇÃO createNft

    // cria NFT usando a função auxiliar e o URI dos metadados
    const nft = await createNFT(metaplex, 
      uri, 
      nftData,
      collectionNft.mint.address
    );

    /*

    // 4.1 CHAMANDO A FUNÇÃO updateNftUri
    
    // carrega dados NFT atualizados e obtém o novo URI para os metadados
    const updateUri = await uploadMetadata(metaplex, updateNftData);

    // atualiza o NFT usando a função auxiliar (updateNftUri) e o novo URI 
    // dos metadados
    await updateNftUri(metaplex, updateUri, nft.address);
  
  */


}

main()
  .then(() => {
    console.log("Finished successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
