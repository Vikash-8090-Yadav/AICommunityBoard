"use client";

import { useWallet } from "../context/wallet-context";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { networks } from "@/config";

interface EthereumError extends Error {
  code: number;
  message: string;
}

export default function NetworkSwitchButton() {
  const { connected, chainId } = useWallet();
  const [showButton, setShowButton] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<string>("");

  useEffect(() => {
    const checkNetwork = async () => {
      console.log("Checking network...", { connected, chainId });
      
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          // Check if wallet is connected by getting accounts
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          const isWalletConnected = accounts.length > 0;
          console.log("Wallet connection status:", { isWalletConnected, accounts });

          if (isWalletConnected) {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            const network = await provider.getNetwork();
            const currentChainId = `0x${network.chainId.toString(16)}`;
            
            console.log("Network details:", {
              currentChainId,
              targetChainId: networks.rootstockTestnet.chainId,
              networkName: network.name
            });
            
            setCurrentNetwork(network.name || "Unknown Network");
            const isWrongNetwork = currentChainId !== networks.rootstockTestnet.chainId;
            console.log("Is wrong network?", isWrongNetwork);
            setShowButton(isWrongNetwork);
          } else {
            console.log("Wallet not connected");
            setShowButton(false);
          }
        } catch (error) {
          console.error("Error checking network:", error);
          setShowButton(false);
        }
      } else {
        console.log("MetaMask not installed");
        setShowButton(false);
      }
    };

    // Check immediately
    checkNetwork();

    // Set up interval to check every 5 seconds
    const interval = setInterval(checkNetwork, 5000);

    // Add event listener for network changes
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on('chainChanged', (newChainId: string) => {
        console.log("Chain changed event:", newChainId);
        checkNetwork();
      });

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        console.log("Accounts changed:", accounts);
        checkNetwork();
      });
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener('chainChanged', checkNetwork);
        window.ethereum.removeListener('accountsChanged', checkNetwork);
      }
    };
  }, [connected, chainId]);

  const handleSwitchNetwork = async () => {
    setLoading(true);
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        alert("Please install MetaMask to use this feature");
        return;
      }

      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log("Current chain ID:", currentChainId);

      if (currentChainId === networks.rootstockTestnet.chainId) {
        setShowButton(false);
        return;
      }

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: networks.rootstockTestnet.chainId }],
        });
      } catch (switchError: unknown) {
        const error = switchError as EthereumError;
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [networks.rootstockTestnet],
            });
          } catch (addError) {
            console.error("Add network error:", addError);
            throw new Error('Failed to add Rootstock Testnet to your wallet');
          }
        } else {
          throw new Error('Failed to switch to Rootstock Testnet network');
        }
      }
    } catch (error) {
      console.error("Network switch error:", error);
      alert(error instanceof Error ? error.message : "Failed to switch network. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Log button visibility
  useEffect(() => {
    console.log("Button visibility:", { showButton, connected, currentNetwork });
  }, [showButton, connected, currentNetwork]);

  if (!showButton) {
    return null;
  }

  return (
    <button
      onClick={handleSwitchNetwork}
      disabled={loading}
      className={`bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition-colors ${
        loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      {loading ? 'Switching...' : 'Switch to Rootstock Testnet'}
    </button>
  );
}