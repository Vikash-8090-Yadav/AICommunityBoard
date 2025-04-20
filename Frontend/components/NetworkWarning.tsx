"use client";

import { useWallet } from "../context/wallet-context";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

interface EthereumProvider extends ethers.providers.ExternalProvider {
  on: (event: string, callback: () => void) => void;
  removeListener: (event: string, callback: () => void) => void;
}

// Use type assertion for window.ethereum
const getEthereumProvider = () => {
  if (typeof window !== "undefined" && window.ethereum) {
    return window.ethereum as unknown as EthereumProvider;
  }
  return null;
};

export default function NetworkWarning() {
  const { connected } = useWallet();
  const [showWarning, setShowWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState("");

  useEffect(() => {
    const checkNetwork = async () => {
      const ethereum = getEthereumProvider();
      if (ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(ethereum);
          const network = await provider.getNetwork();
          setCurrentNetwork(network.name);
          setShowWarning(network.chainId !== 31);
        } catch (error) {
          console.error("Error checking network:", error);
        }
      }
    };

    checkNetwork();

    // Listen for network changes
    const ethereum = getEthereumProvider();
    if (ethereum) {
      ethereum.on("chainChanged", () => {
        checkNetwork();
      });
    }

    return () => {
      const ethereum = getEthereumProvider();
      if (ethereum) {
        ethereum.removeListener("chainChanged", checkNetwork);
      }
    };
  }, []);

  const handleSwitchNetwork = async () => {
    const ethereum = getEthereumProvider();
    if (!ethereum) {
      alert("Please install MetaMask to use this application");
      return;
    }

    setLoading(true);
    try {
      const request = ethereum.request;
      if (request) {
        await request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x1f" }], // 31 in hex
        });
      } else {
        throw new Error("Ethereum provider request method not available");
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