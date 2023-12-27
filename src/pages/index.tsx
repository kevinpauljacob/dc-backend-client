import React, { useState, useEffect, useMemo } from "react";
import {
  Metaplex,
  bundlrStorage,
  toMetaplexFile,
  walletAdapterIdentity,
} from "@metaplex-foundation/js";
import { Connection, PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import NFTDetails from "@/components/nftDetails/NFTDetails";

interface NFT {
  uri: string;
  name: string;
  sellerFeeBasisPoints: number;
  symbol: string;
  creators: Object;
  isMutable: boolean;
  address: string | PublicKey;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [nftName, setNFTName] = useState<string>("");
  const [nftDescription, setNFTDescription] = useState<string>("");
  const [tokenId, setTokenId] = useState<number>(0);
  const [nftSymbol, setNFTSymbol] = useState<string>("");
  const [imgUri, setImgUri] = useState<string>("");
  const [arweaveImgUri, setArweaveImgUri] = useState<string>("");
  const [metaDataUri, setMetaDataUri] = useState<string>("");
  const [explorerAddress, setExplorerAddress] = useState<string>("");
  const [loadingState, setLoadingState] = useState<boolean>(false);
  const [showNFTDetails, setShowNFTDetails] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<PublicKey | string>();

  const RPC_ENDPOINT =
    "https://old-small-tent.solana-devnet.discover.quiknode.pro/34f843136b5a8476e55f8b424fb9c3a04938c912/";
  const wallet = useWallet();

  const METAPLEX = useMemo(() => {
    const CONNECTION = new Connection(RPC_ENDPOINT);
    const metaplexInstance = Metaplex.make(CONNECTION).use(
      bundlrStorage({
        address: "https://devnet.bundlr.network",
        providerUrl: RPC_ENDPOINT,
        timeout: 60000,
      })
    );

    if (wallet.connected) {
      metaplexInstance.use(walletAdapterIdentity(wallet));
    }

    return metaplexInstance;
  }, [wallet]);

  useEffect(() => {
    setPublicKey(METAPLEX.identity().publicKey.toBase58());
  }, [METAPLEX]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    setFile(uploadedFile || null);
  };

  async function uploadImage(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event: any) => {
        try {
          const imgBuffer = new Uint8Array(event.target.result);
          const imgMetaplexFile = toMetaplexFile(imgBuffer, file.name);

          const imgUri = await METAPLEX.storage().upload(imgMetaplexFile);
          setImgUri(imgUri);
          setArweaveImgUri(imgUri);
          console.log("Image URI:", imgUri);
          toast.success("Image Uploaded to Arweave", {
            position: toast.POSITION.BOTTOM_RIGHT,
          });
          resolve(imgUri);
        } catch (error) {
          console.error("Error uploading image:", error);
          toast.error("Error uploading image", {
            position: toast.POSITION.BOTTOM_RIGHT,
          });
          reject(error);
        }
      };

      reader.readAsArrayBuffer(file);
    });
  }

  async function uploadMetadata(
    imageUri: string,
    imageType: string,
    nftName: string,
    description: string,
    tokenId: number,
    attributes: any
  ) {
    try {
      const metadataUri = await METAPLEX.nfts().uploadMetadata({
        name: nftName,
        description: description,
        tokenId: tokenId,
        image: imageUri,
        attributes: attributes,
        properties: {
          files: [
            {
              type: imageType,
              uri: imageUri,
            },
          ],
        },
      });

      console.log("Metadata URI:", metadataUri);
      setMetaDataUri(metadataUri.uri);
      toast.success("MetaData uploaded to Arweave", {
        position: toast.POSITION.BOTTOM_RIGHT,
      });
      return metadataUri;
    } catch (error) {
      console.error("Error uploading metadata:", error);
      toast.error("Error uploading MetaData to Arweave", {
        position: toast.POSITION.BOTTOM_RIGHT,
      });
      throw error;
    }
  }

  async function mintNft(
    metadataUri: string,
    name: string,
    sellerFee: number,
    symbol: string,
    creators: any
  ) {
    try {
      console.log("Step 3 - Minting NFT");

      const { nft }: { nft: NFT } = await METAPLEX.nfts().create(
        {
          uri: metadataUri,
          name: name,
          sellerFeeBasisPoints: sellerFee,
          symbol: symbol,
          creators: creators,
          isMutable: false,
        },
        { commitment: "finalized" }
      );

      console.log(`Success! 🎉`);
      console.log("nft", nft);
      if (nft.address !== undefined) {
        console.log(
          `Minted NFT: https://explorer.solana.com/address/${nft.address}?cluster=devnet`
        );
        setExplorerAddress(
          `https://explorer.solana.com/address/${nft.address}?cluster=devnet`
        );
        toast.success("NFT Minted Successfully!", {
          position: toast.POSITION.BOTTOM_RIGHT,
        });
        setLoadingState(false);
        const nftData = {
          [nft.address.toString()]: publicKey,
        };

        const response = await axios.post(
          "https://dc-backend-server.onrender.com/api/nfts",
          { newNFTData: nftData }
        );

        if (response.status === 201 && response.data) {
          console.log("Data sent to server successfully");
        } else {
          console.error("Failed to send data to the server");
        }
      }
    } catch (error) {
      console.error("Error minting NFT:", error);
      toast.error("Error minting NFT!", {
        position: toast.POSITION.BOTTOM_RIGHT,
      });
    }
  }

  const mint = async () => {
    if (!wallet.connected) {
      toast.error("Connect your wallet.", {
        position: toast.POSITION.BOTTOM_RIGHT,
      });

      return;
    }

    if (!file) {
      toast.error("Please select a file to upload.", {
        position: toast.POSITION.BOTTOM_RIGHT,
      });

      return;
    }

    try {
      setLoadingState(true);
      setShowNFTDetails(true);
      // Step 1 - Upload the image
      const imgUri = await uploadImage(file);

      // Step 2 - Upload the metadata
      const imgType = "image/png";
      const attributes = [
        { trait_type: "Speed", value: "Quick" },
        { trait_type: "Type", value: "Pixelated" },
        { trait_type: "Background", value: "QuickNode Blue" },
      ];
      const metadataUri = await uploadMetadata(
        imgUri as string,
        imgType,
        nftName,
        nftDescription,
        tokenId,
        attributes
      );
      // Step 3 - Mint the NFT
      const sellerFee = 500;
      const creators = [{ address: METAPLEX.identity().publicKey, share: 100 }];

      await mintNft(metadataUri.uri, nftName, sellerFee, nftSymbol, creators);
      setNFTName("");
      setFile(null);
      setNFTDescription("");
      setImgUri("");
      setNFTSymbol("");
      setTokenId(0);
    } catch (error) {
      console.error("Error minting NFT:", error);
    }
  };

  return (
    <main className="bg-[#171717] text-white min-h-screen w-full lg:px-64 md:px-40 sm:px-20 px-10 py-10">
      <ToastContainer />
      <nav className="flex flex-col sm:flex-row items-center sm:justify-between sm:items-center">
        <p className="text-lg font-semibold pb-5 sm:pb-0">
          Doge Capital - NFT Minting Dapp
        </p>
        <WalletMultiButton />
      </nav>
      <div className="flex flex-col w-min mx-auto mt-10">
        <h1 className="text-2xl font-semibold text-center mb-5">
          Mint your own NFT!
        </h1>
        <input
          className="my-5 border border-white rounded-md p-2.5"
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
        />
        <input
          className="my-5 bg-[#171717] border border-white focus:outline-none focus:border-white/70 transition duration-300 ease-in-out hover:transition hover:duration-300 hover:ease-in-out rounded-md p-2.5"
          type="text"
          placeholder="NFT Name"
          value={nftName}
          onChange={(e) => setNFTName(e.target.value)}
        />
        <input
          className="my-5 bg-[#171717] border border-white focus:outline-none focus:border-white/70 transition duration-300 ease-in-out hover:transition hover:duration-300 hover:ease-in-out rounded-md p-2.5"
          type="text"
          placeholder="NFT Description"
          value={nftDescription}
          onChange={(e) => setNFTDescription(e.target.value)}
        />
        <input
          className="my-5 bg-[#171717] border border-white focus:outline-none focus:border-white/70 transition duration-300 ease-in-out hover:transition hover:duration-300 hover:ease-in-out rounded-md p-2.5"
          type="text"
          placeholder="Token ID"
          value={tokenId.toString()}
          onChange={(e) => {
            const inputVal = e.target.value;
            const parsedValue = parseInt(inputVal, 10);

            if (!isNaN(parsedValue)) {
              setTokenId(parsedValue);
            } else {
              setTokenId(0);
            }
          }}
        />
        <input
          className="my-5 bg-[#171717] border border-white focus:outline-none focus:border-white/70 transition duration-300 ease-in-out hover:transition hover:duration-300 hover:ease-in-out rounded-md p-2.5"
          type="text"
          placeholder="NFT Symbol"
          value={nftSymbol}
          onChange={(e) => setNFTSymbol(e.target.value)}
        />
        <button
          onClick={mint}
          className="text-md font-semibold bg-[#512DA8] rounded-md transition duration-300 ease-in-out hover:bg-[#1A1F2E] hover:transition hover:duration-300 hover:ease-in-out py-3"
        >
          Mint NFT
        </button>
      </div>
      {showNFTDetails ? (
        <NFTDetails
          imgUri={arweaveImgUri}
          metaDataUri={metaDataUri}
          explorerAddress={explorerAddress}
          loadingState={loadingState}
        />
      ) : null}
    </main>
  );
}
