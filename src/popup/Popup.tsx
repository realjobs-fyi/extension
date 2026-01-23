import { useState, useEffect } from "react";
import {
  Bug,
  Cog,
  Info,
  Funnel,
  FunnelX,
  ArrowUpRight,
  ChartPie,
} from "lucide-react";
import { TrackingEntry } from "types/track";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatNumber } from "@/utils/number";

type MessageResponse = {
  success?: boolean;
  isValid?: boolean;
  active?: boolean;
};

export default function Popup() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isValidUrl, setIsValidUrl] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusType, setStatusType] = useState<"success" | "warning" | "">("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hiddenJobsCount, setHiddenJobsCount] = useState<number>(0);
  const [bannedCompaniesCount, setBannedCompaniesCount] = useState<number>(0);

  // Check if current page is valid
  const checkUrl = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "checkUrl" },
        (response: MessageResponse) => {
          resolve(response?.isValid ?? false);
        }
      );
    });
  };

  // Get hidden jobs count for last 7 days
  const getHiddenJobsCount = async (): Promise<number> => {
    const data = (await chrome.storage.local.get("jobTrackingData")) as {
      jobTrackingData: TrackingEntry[];
    };
    const last7Days = data?.jobTrackingData?.filter((item) => {
      const date = new Date(item.date);
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      return date > last7Days;
    });
    return last7Days?.length ?? 0;
  };

  // Get banned companies count
  const getBannedCompaniesCount = async (): Promise<number> => {
    const data = await chrome.storage.sync.get("bannedCompanies");
    return data?.bannedCompanies?.length ?? 0;
  };

  // Get current state
  const getState = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "getState" },
        (response: MessageResponse) => {
          resolve(response?.active ?? false);
        }
      );
    });
  };



  // Update UI based on state
  const updateUI = async () => {
    const [count, companiesCount, isValid, active] = await Promise.all([
      getHiddenJobsCount(),
      getBannedCompaniesCount(),
      checkUrl(),
      getState(),
    ]);
    setHiddenJobsCount(count);
    setBannedCompaniesCount(companiesCount);

    setIsValidUrl(isValid);
    setIsActive(active);
    if (!isValid) {
      setStatusMessage("Navigate to a LinkedIn job search page.");
      setStatusType("warning");

      return;
    }

    if (active) {
      setStatusMessage("Filters are active");
      setStatusType("success");
    } else {
      setStatusMessage("Filters are inactive");
      setStatusType("");
    }
  };

  // Activate filters
  const handleActivate = async () => {
    const isValid = await checkUrl();
    if (!isValid) {
      setErrorMessage("Please navigate to a LinkedIn job search page first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    chrome.runtime.sendMessage(
      { action: "activate" },
      (response: MessageResponse) => {
        if (response?.success) {
          setStatusMessage("Activating filters... Page will reload.");
          setStatusType("success");
          setTimeout(() => {
            window.close();
          }, 1000);
        } else {
          setErrorMessage("Failed to activate filters. Please try again.");
          setIsLoading(false);
        }
      }
    );
  };

  // Deactivate filters
  const handleDeactivate = async () => {
    setIsLoading(true);
    setErrorMessage("");

    chrome.runtime.sendMessage(
      { action: "deactivate" },
      (response: MessageResponse) => {
        if (response?.success) {
          setStatusMessage("Filters deactivated");
          setStatusType("");
          updateUI();
          setIsLoading(false);
        } else {
          setErrorMessage("Failed to deactivate filters. Please try again.");
          setIsLoading(false);
        }
      }
    );
  };

  // Initialize UI and listen for tab updates
  useEffect(() => {
    updateUI();

    const listener = () => {
      updateUI();
    };

    chrome.tabs.onUpdated.addListener(listener);

    return () => {
      chrome.tabs.onUpdated.removeListener(listener);
    };
  }, []);

  return (
    <div className="flex flex-col w-[420px] h-full bg-[#f2f4f5] pt-6">
      <div className="w-full flex flex-col items-center justify-center gap-6">
        <div className="flex flex-col items-center justify-center gap-6 w-full px-8">
          {/* Header */}
          <div className={`flex flex-row items-center justify-between gap-1 w-full ${statusMessage ? "mb-4" : "mb-6"}`}>
            <div className="flex flex-row items-center justify-center gap-2">
            <img src="/icon.svg" alt="Real Jobs Logo" width={24} height={24} />
            <span className="text-xs text-[#304fff] uppercase font-semibold py-1 px-3 bg-white rounded-full border border-[#304fff]">BETA</span>
            </div>
            <div className="flex flex-row items-center justify-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      chrome.tabs.create({
                        url: chrome.runtime.getURL('src/options/index.html#analytics')
                      });
                    }}
                    aria-label="Analytics"
                    title="Analytics"
                    className="flex flex-row items-center justify-center gap-2 bg-black rounded-full p-2 cursor-pointer hover:opacity-80 transition-all duration-300"
                  >
                    <ChartPie className="w-4 h-4 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px]">Analytics</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="https://realjobs.fyi/blog"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Learn more"
                    title="Learn more"
                    className="flex flex-row items-center justify-center gap-2 bg-white rounded-full p-2 cursor-pointer hover:opacity-80 transition-all duration-300"
                  >
                    <ArrowUpRight className="w-4 h-4 text-black" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px]">Learn more</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Status Message */}
          {statusMessage && statusType === "warning" && (
            <a className="w-full" href="https://linkedin.com/jobs/search/" target="_blank" rel="noopener noreferrer">
              <div className="flex items-center justify-start py-2.5 px-4 w-full bg-white rounded-lg gap-2">
              <Info className="w-4 h-4 text-yellow-500" />
              <p className="text-center font-semibold text-xs text-yellow-500">{statusMessage}</p>
            </div>
            </a>
          )}

          {/* Hidden Jobs Count */}
          <div className="flex flex-row items-center justify-between gap-2 w-full">
          <div className="flex flex-col w-full bg-white rounded-xl items-start justify-center py-3 px-4 gap-2">
            <div className="flex flex-row items-center justify-start gap-2">
              <p className="text-gray-500 text-xs">
                Jobs hidden
              </p>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px]">Last 7 days</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <p className="text-3xl font-semibold">{formatNumber(hiddenJobsCount)}</p>
          </div>
          <div className="flex flex-col w-full bg-white rounded-xl items-start justify-center py-3 px-4 gap-2">
            <div className="flex flex-row items-center justify-start gap-2">
              <p className="text-gray-500 text-xs">
                Banned companies
              </p>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-gray-500" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px]">Banned companies will not appear in job listings</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <p className="text-3xl font-semibold">{formatNumber(bannedCompaniesCount)}</p>
          </div>
          </div>

          {/* Button Group */}
          <div className="flex flex-col items-center justify-center w-full gap-1">
            {!isActive ? (
              <button
                onClick={handleActivate}
                disabled={!isValidUrl || isLoading}
                aria-label="Activate filters"
                title="Activate filters"
                className="flex items-center justify-center py-2 px-0 w-full gap-2 text-white font-medium bg-green-500 rounded-lg hover:bg-green-600 cursor-pointer duration-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="text-sm font-medium">...</span>
                ) : (
                  <>
                    <Funnel className="w-4 h-4 text-white" />{" "}
                    <span className="text-white">Activate filters</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleDeactivate}
                disabled={isLoading}
                aria-label="Deactivate filters"
                title="Deactivate filters"
                className="flex items-center justify-center py-[8px] px-0 w-full gap-2 text-white font-medium bg-red-500 rounded-lg hover:bg-red-600 cursor-pointer duration-300 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="text-sm font-medium">...</span>
                ) : (
                  <>
                    <FunnelX className="w-4 h-4 text-white" />{" "}
                    <span className="text-white">Deactivate filters</span>
                  </>
                )}
              </button>
              
            )}
          </div>

          {/* Info Section */}
          <div className="flex flex-col items-center justify-center gap-1 w-full">
            <button
              onClick={() => {
                chrome.tabs.create({
                  url: chrome.runtime.getURL('src/options/index.html#settings')
                });
              }}
              className="flex items-center justify-center gap-2 w-full py-2 px-0 text-white font-medium bg-[#133cff] rounded-lg hover:bg-[#133cff]/80 cursor-pointer transition-colors duration-300"
            >
              <Cog className="w-4 h-4 text-white" />
              <span>Preferences</span>
            </button>

            <p className="text-[8px] text-[#71717b] text-center mt-1">
              Filters will hide promoted posts by default and jobs with banned
              words.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className=" p-3 bg-red-50 text-red-800 border border-red-200 rounded-md text-sm">
              {errorMessage}
            </div>
          )}
        </div>
        <footer className="flex items-center justify-center bg-[#304FFF] w-full py-3 text-[10px] gap-2 mt-6">
          <Bug className="w-[14px] h-[14px] text-[#ffffff]" />
          <a
            href="https://github.com/realjobs-fyi/extension/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[#ffffff] underline decoration-dotted underline-offset-2 hover:decoration-solid transition-all duration-300 cursor-pointers"
          >
            Report a problem
          </a>
        </footer>
      </div>
    </div>
  );
}
