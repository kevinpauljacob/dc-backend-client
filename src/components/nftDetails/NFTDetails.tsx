import React, { useState, useEffect } from "react";
import Link from "next/link";
import { MoonLoader } from "react-spinners";

interface NFTDetailsProps {
  imgUri: string;
  metaDataUri: string;
  explorerAddress: string;
  loadingState: boolean;
}

const NFTDetails: React.FC<NFTDetailsProps> = ({
  imgUri,
  metaDataUri,
  explorerAddress,
  loadingState,
}) => {
  const [color, setColor] = useState("#ffffff");

  return (
    <div className="flex flex-col items-center w-full mx-auto mt-10">
      <h2 className="text-center font-semibold text-xl mb-5">NFT Details</h2>
      {loadingState ? (
        <MoonLoader
          color={color}
          loading={loadingState}
          size={25}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      ) : (
        <ul>
          <li className="underline underline-offset-1 text-center font-semibold transition ease-in-out duration-300 hover:transition hover:ease-in-out hover:duration-300 hover:text-purple-500">
            <Link target="_blank" href={imgUri} className="text-clip">
              Arweave Image URI
            </Link>
          </li>
          <li className="underline underline-offset-1 text-center font-semibold transition ease-in-out duration-300 hover:transition hover:ease-in-out hover:duration-300 hover:text-purple-500">
            <Link target="_blank" href={metaDataUri} className="text-clip">
              NFT MetaData URI
            </Link>
          </li>
          <li className="underline underline-offset-1 text-center font-semibold transition ease-in-out duration-300 hover:transition hover:ease-in-out hover:duration-300 hover:text-purple-500">
            <Link target="_blank" href={explorerAddress} className="text-clip">
              Solana Explorer Address
            </Link>
          </li>
        </ul>
      )}
    </div>
  );
};

export default NFTDetails;
