"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { ethers } from "ethers";
import { networks } from "@/config";

interface WalletContextType {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  address: string;
  connected: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isCorrectNetwork: boolean;
  setIsCorrectNetwork: (value: boolean) => void;
  loading: boolean;
  showDisconnectWarning: boolean;
  setShowDisconnectWarning: (value: boolean) => void;
}

const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  address: "",
  connected: false,
  chainId: null,
  connect: async () => {},
  disconnect: () => {},
  isCorrectNetwork: false,
  setIsCorrectNetwork: () => {},
  loading: false,
  showDisconnectWarning: false,
  setShowDisconnectWarning: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [address, setAddress] = useState("");
  const [connected, setConnected] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [showDisconnectWarning, setShowDisconnectWarning] = useState(false);

  const refreshPage = () => {
    try {
      // Try different methods to refresh the page
      if (window.location && window.location.reload) {
        window.location.reload();
      } else if (window.location && window.location.href) {
        window.location.href = window.location.href;
      } else if (window.location && window.location.replace) {
        window.location.replace(window.location.href);
      }
    } catch (error) {
      console.error("Failed to refresh page:", error);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
      setProvider(ethersProvider);

      const checkConnection = async () => {
        try {
          const accounts = await ethersProvider.listAccounts();
          if (accounts.length > 0) {
            const ethSigner = ethersProvider.getSigner();
            const userAddress = await ethSigner.getAddress();
            const network = await ethersProvider.getNetwork();
            
            console.log("Connected to network:", {
              chainId: network.chainId,
              name: network.name
            });

            setSigner(ethSigner);
            setAddress(userAddress);
            setConnected(true);
            setChainId(network.chainId);
            setIsCorrectNetwork(network.chainId === 31); // Rootstock Testnet chain ID
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      };

      checkConnection();

      // Listen for network changes
      (window as any).ethereum.on("chainChanged", async (chainId: string) => {
        console.log("Network changed to chainId:", chainId);
        const newChainId = parseInt(chainId, 16);
        setChainId(newChainId);
        setIsCorrectNetwork(newChainId === 31); // Rootstock Testnet chain ID
        
        // Update provider and signer
        const newProvider = new ethers.providers.Web3Provider((window as any).ethereum);
        setProvider(newProvider);
        setSigner(newProvider.getSigner());
        
        // Check if we still have accounts connected
        const accounts = await newProvider.listAccounts();
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          setConnected(true);
        } else {
          setAddress("");
          setConnected(false);
        }

        // Refresh page when network changes
        refreshPage();
      });

      // Listen for account changes
      (window as any).ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnect();
        } else {
          setAddress(accounts[0]);
          if (typeof window !== 'undefined') {
            localStorage.setItem("walletAddress", accounts[0]);
          }
        }
        // Refresh page when account changes
        refreshPage();
      });

      return () => {
        (window as any).ethereum.removeAllListeners("accountsChanged");
        (window as any).ethereum.removeAllListeners("chainChanged");
      };
    }
  }, []);

  const connect = async () => {
    try {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        const ethersProvider = new ethers.providers.Web3Provider((window as any).ethereum);
        const accounts = await ethersProvider.send("eth_requestAccounts", []);
        
        if (accounts.length > 0) {
          const ethSigner = ethersProvider.getSigner();
          const userAddress = await ethSigner.getAddress();
          const network = await ethersProvider.getNetwork();

          setProvider(ethersProvider);
          setSigner(ethSigner);
          setAddress(userAddress);
          setConnected(true);
          setChainId(network.chainId);
          setIsCorrectNetwork(network.chainId === 31); // Rootstock Testnet chain ID

          if (typeof window !== 'undefined') {
            localStorage.setItem("walletAddress", userAddress);
          }

          // Refresh page after successful connection
          refreshPage();
        }
      }
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      throw new Error(error.message || "Failed to connect wallet");
    }
  };

  const disconnect = () => {
    setSigner(null);
    setAddress("");
    setConnected(false);
    setChainId(null);
    setIsCorrectNetwork(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem("walletAddress");
    }
    // Show the disconnect warning modal
    setShowDisconnectWarning(true);
  };

  return (
    <WalletContext.Provider
      value={{
        provider,
        signer,
        address,
        connected,
        chainId,
        connect,
        disconnect,
        isCorrectNetwork,
        setIsCorrectNetwork,
        loading: false,
        showDisconnectWarning,
        setShowDisconnectWarning,
      }}
    >
      {children}
      {showDisconnectWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-gray-900 p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-gray-700">
            <div className="text-center">
              <div className="text-5xl mb-6">🔌</div>
              <h2 className="text-2xl font-bold mb-4 text-white">Wallet Disconnected</h2>
              <p className="text-gray-300 mb-8 text-lg">
                Your wallet has been disconnected. You can connect again when you're ready.
              </p>
              <button
                onClick={() => setShowDisconnectWarning(false)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);