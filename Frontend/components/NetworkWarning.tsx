"use client";

import { useWallet } from "../context/wallet-context";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { networks } from "@/config";

interface EthereumError extends Error {
  code: number;
  message: string;
}

export default function NetworkWarning() {
  const { connected, chainId } = useWallet();
  const [showWarning, setShowWarning] = useState(false);
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
            setShowWarning(isWrongNetwork);
          } else {
            console.log("Wallet not connected");
            setShowWarning(false);
          }
        } catch (error) {
          console.error("Error checking network:", error);
          setShowWarning(false);
        }
      } else {
        console.log("MetaMask not installed");
        setShowWarning(false);
      }
    };

    // Check immediately
    checkNetwork();

    // Set up interval to check every 5 seconds
    const interval = setInterval(checkNetwork, 5000);

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
        setShowWarning(false);
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

  // Log warning visibility
  useEffect(() => {
    console.log("Warning visibility:", { showWarning, connected, currentNetwork });
  }, [showWarning, connected, currentNetwork]);

  if (!showWarning) {
    return null;
  }

  return (
    <>
      {/* Full-screen overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[100]" />
      
      {/* Centered warning modal */}
      <div className="fixed inset-0 flex items-center justify-center z-[101]">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <span className="text-6xl mb-4">⚠️</span>
            <h2 className="text-2xl font-bold text-red-600 mb-4">Wrong Network Detected</h2>
            <p className="text-gray-700 mb-6">
              You are currently connected to <span className="font-semibold">{currentNetwork}</span>.
              Please switch to Rootstock Testnet to use this application.
            </p>
            <button
              onClick={handleSwitchNetwork}
              disabled={loading}
              className={`w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Switching Network...' : 'Switch to Rootstock Testnet'}
            </button>
            <p className="mt-4 text-sm text-gray-500">
              Need help? <a href="https://explorer.testnet.rootstock.io/" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Learn more about Rootstock Testnet</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
} 