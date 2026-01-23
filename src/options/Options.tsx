import { useState, useEffect, useCallback } from "react";
import {
  Info,
  ChevronRight,
  Calendar,
  X,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import JobTracker from "@/utils/tracker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SettingsData {
  hidePromotedPositions?: boolean;
  sortByDD?: boolean;
  bannedWords?: string[];
  active?: boolean;
}

export function Options() {
  const [hidePromoted, setHidePromoted] = useState<boolean>(true);
  const [sortByDD, setSortByDD] = useState<boolean>(true);
  const [bannedWords, setBannedWords] = useState<string[]>([]);
  const [newWordInput, setNewWordInput] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusType, setStatusType] = useState<"success" | "error" | "info">(
    "info"
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<
    "settings" | "analytics"
  >("settings");
  const [chartDays, setChartDays] = useState<7 | 14 | 30>(7);
  const [chartData, setChartData] = useState<
    Array<{ date: string; hidden: number }>
  >([]);
  const [bannedWordsData, setBannedWordsData] = useState<
    Array<{ word: string; count: number }>
  >([]);
  const [pieChartData, setPieChartData] = useState<
    Array<{ reason: string; count: number; fill: string }>
  >([]);
  const [userChangedSettings, setUserChangedSettings] =
    useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Load current settings
  const loadSettings = (): void => {
    chrome.storage.sync.get(
      ["hidePromotedPositions", "sortByDD", "bannedWords"],
      (result: SettingsData) => {
        setHidePromoted(result.hidePromotedPositions !== false); // Default to true
        setSortByDD(result.sortByDD !== false); // Default to true
        setBannedWords(result.bannedWords || []);
        setUserChangedSettings(false); // Reset flag when loading existing settings
      }
    );
  };

  // Save settings
  const saveSettings = (): void => {
    setIsLoading(true);
    // Filter out empty strings and trim all words
    const bannedWordsArray = bannedWords
      .map((word) => word.trim())
      .filter((word) => word.length > 0);

    chrome.storage.sync.set(
      {
        hidePromotedPositions: hidePromoted,
        sortByDD: sortByDD,
        bannedWords: bannedWordsArray,
      },
      () => {
        showStatus("Settings saved successfully!", "success");
        setIsLoading(false);
        setUserChangedSettings(false); // Reset flag only after successful save
        // If active, reload any open LinkedIn job search tabs to apply new settings
        chrome.storage.sync.get(["active"], (result: SettingsData) => {
          if (result.active) {
            chrome.tabs.query(
              { url: "https://www.linkedin.com/jobs/search/*" },
              (tabs) => {
                tabs.forEach((tab) => {
                  if (tab.id) {
                    chrome.tabs.reload(tab.id);
                  }
                });
              }
            );
          }
        });
      }
    );
  };

  // Reset to defaults
  const resetSettings = (): void => {
    if (
      window.confirm("Are you sure you want to reset all settings to defaults?")
    ) {
      setHidePromoted(true);
      setSortByDD(true);
      setBannedWords([]);
      setUserChangedSettings(true); // Mark as changed so save button is enabled
      // Save immediately after reset
      setTimeout(() => {
        saveSettings();
      }, 0);
    }
  };

  // Handle adding a new banned word
  const handleAddWord = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const word = newWordInput.trim().toLowerCase();
    if (word && !bannedWords.includes(word)) {
      setBannedWords([...bannedWords, word]);
      setNewWordInput("");
      setUserChangedSettings(true);
    }
  };

  // Handle removing a banned word
  const handleRemoveWord = (wordToRemove: string): void => {
    setBannedWords(bannedWords.filter((word) => word !== wordToRemove));
    setUserChangedSettings(true);
  };

  // Show status message
  const showStatus = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ): void => {
    setStatusMessage(message);
    setStatusType(type);
    setTimeout(() => {
      setStatusMessage("");
    }, 3000);
  };

  // Load chart data
  const loadChartData = useCallback(async (days: number): Promise<void> => {
    try {
      const timeSeriesData = await JobTracker.getTimeSeriesData({ days });

      // Get all dates in the range (using local timezone)
      const dates: string[] = [];
      const today = new Date();
      // Get local date string (YYYY-MM-DD) without timezone conversion
      const getLocalDateString = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(getLocalDateString(date));
      }

      // Format data for chart
      const formattedData = dates.map((dateStr) => {
        const dayData = timeSeriesData[dateStr] || { total: 0 };
        // Parse the date string (YYYY-MM-DD) as local date, not UTC
        const [year, month, day] = dateStr.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        return {
          date: date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          hidden: dayData.total,
        };
      });

      setChartData(formattedData);
    } catch (error) {
      console.error("Error loading chart data:", error);
      setChartData([]);
    }
  }, []);

  // Load banned words data
  const loadBannedWordsData = useCallback(async (): Promise<void> => {
    try {
      const words = await JobTracker.getMostCommonBannedWords(10);
      setBannedWordsData(words);
    } catch (error) {
      console.error("Error loading banned words data:", error);
      setBannedWordsData([]);
    }
  }, []);

  // Load pie chart data (promoted vs banned words)
  const loadPieChartData = useCallback(async (): Promise<void> => {
    try {
      const stats = await JobTracker.getStatistics({ days: chartDays });
      const data = [
        {
          reason: "promoted",
          count: stats.promoted,
          fill: "var(--color-promoted)",
        },
        {
          reason: "banned_words",
          count: stats.bannedWords,
          fill: "var(--color-banned_words)",
        },
      ].filter((item) => item.count > 0); // Only show segments with data
      setPieChartData(data);
    } catch (error) {
      console.error("Error loading pie chart data:", error);
      setPieChartData([]);
    }
  }, [chartDays]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    // Read hash from URL to set initial tab
    const hash = window.location.hash.slice(1); // Remove the '#'
    if ( hash === "settings" || hash === "analytics") {
      setActiveTab(hash);
    }
    setMounted(true);
  }, []);

  // Warn user before closing tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (userChangedSettings) {
        e.preventDefault();
        // Modern browsers require returnValue to be set
        e.returnValue = "";
        // Some browsers also require a return statement
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [userChangedSettings]);

  // Load chart data when analytics tab is active or days change
  useEffect(() => {
    if (activeTab === "analytics") {
      loadChartData(chartDays);
      loadBannedWordsData();
      loadPieChartData();
    }
  }, [
    activeTab,
    chartDays,
    loadChartData,
    loadBannedWordsData,
    loadPieChartData,
  ]);

  return (
    <div className="min-h-screen bg-white z-10 w-full">

      <div className="container mx-auto max-w-3xl mt-8">
        {/* Header */}
        <div className="flex items-center justify-start gap-1 px-6">
          <h1 className="text-2xl font-semibold text-gray-900">Options</h1>
          <ChevronRight className="w-4 h-4 text-gray-500 mt-0.5" />
          <span className="text-sm text-gray-500 capitalize mt-0.5">
            {activeTab}
          </span>
        </div>

        <div className="flex items-center justify-start gap-1 mt-8 mb-4 px-6">
          <button
            className={`py-2 px-4 rounded-sm text-xs font-medium cursor-pointer transition-all duration-300 ${
              activeTab === "settings" ? "bg-gray-100" : ""
            }`}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
          <button
            className={`py-2 px-4 rounded-sm text-xs font-medium cursor-pointer transition-all duration-300 ${
              activeTab === "analytics" ? "bg-gray-100" : ""
            }`}
            onClick={() => setActiveTab("analytics")}
          >
            Analytics
          </button>
        </div>

        {activeTab === "settings" && (
          <>
            {/* Settings Section */}
            <div className=" p-6 mb-6 space-y-8">
              {/* Hide Promoted Positions */}
              <div className="flex flex-row items-center justify-between gap-3">
                <div>
                  <div className="flex flex-row items-center justify-start gap-1">
                    <h2 className="text-sm font-medium text-gray-900">
                      Hide Promoted Positions
                    </h2>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Promoted job listings typically receive fewer
                          responses than regular job postings
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-gray-400">
                    Automatically hide all promoted job listings
                  </p>
                </div>
                <div>
                  <Switch
                    checked={hidePromoted}
                    onCheckedChange={(checked) => {
                      setHidePromoted(checked);
                      setUserChangedSettings(true);
                    }}
                    className="data-[state=checked]:bg-[#133cff] w-[34px] h-[22px]"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gray-200 mb-6" />

              {/* Sort by Most Recent */}
              <div className="flex flex-row items-center justify-between gap-3">
                <div>
                  <div className="flex flex-row items-center justify-start gap-1">
                    <h2 className="text-sm font-medium text-gray-900">
                      Sort by Most Recent
                    </h2>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          Jobs posted more recently are typically fresher, have
                          less applicants, and more likely to be a good fit for
                          you
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-gray-400">
                    Automatically sort job listings by date posted
                  </p>
                </div>
                <div>
                  <Switch
                    checked={sortByDD}
                    onCheckedChange={(checked) => {
                      setSortByDD(checked);
                      setUserChangedSettings(true);
                    }}
                    className="data-[state=checked]:bg-[#133cff] w-[34px] h-[22px]"
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gray-200 mb-6" />

              {/* Banned Words */}
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex flex-row items-center justify-start gap-1">
                    <h2 className="text-sm font-medium text-gray-900">
                      Banned Words
                    </h2>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-3 h-3 text-gray-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">
                          These words will be filtered out from job titles
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <p className="text-xs text-gray-400">
                    Enter words that should be filtered out from job titles
                  </p>
                </div>
                <div>
                  {bannedWords.length > 0 ? (
                    <div className="flex flex-row items-center justify-start gap-2 flex-wrap">
                      {bannedWords.map((word, index) => (
                        <button
                          key={`${word}-${index}`}
                          onClick={() => handleRemoveWord(word)}
                          aria-label={`Remove ${word}`}
                          title={`Remove ${word}`}
                          className="flex flex-row items-center justify-start gap-2 bg-[#133cff] hover:bg-red-500 transition-all duration-300 rounded-xl py-1 px-3 w-fit cursor-pointer"
                        >
                          <p className="text-xs text-white font-medium capitalize cursor-pointer">
                            {word}
                          </p>
                          <span className="cursor-pointer">
                            <X
                              strokeWidth={3}
                              fill="white"
                              className="w-3 h-3 text-white"
                            />
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No banned words added yet
                    </p>
                  )}
                </div>
                <div>
                  <form
                    className="flex flex-row items-center justify-start gap-1 mt-4"
                    onSubmit={handleAddWord}
                  >
                    <input
                      type="text"
                      placeholder="Enter a word"
                      value={newWordInput}
                      onChange={(e) => setNewWordInput(e.target.value)}
                      className="w-full px-4 h-9 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                    />
                    <button
                      type="submit"
                      className="w-fit h-9 px-10 bg-[#133cff] text-white font-medium rounded-lg hover:opacity-80 transition-all duration-300 cursor-pointer"
                    >
                      Add
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-4 justify-end items-center p-6">
              <button
                id="resetBtn"
                onClick={resetSettings}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 py-3 px-4 text-black font-medium rounded-lg border border-gray-300 hover:bg-gray-100 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer"
              >
                <span>Reset to Defaults</span>
              </button>
              <button
                id="saveBtn"
                onClick={saveSettings}
                disabled={isLoading || !userChangedSettings}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#133cff] text-white font-medium rounded-lg hover:opacity-80 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-all duration-300 cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="text-sm font-medium">Saving...</span>
                ) : (
                  <>
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>

            {/* Status Message */}
            <div className="relative  flex items-center justify-center gap-2 p-6 w-full">
              {/* Success */}
              <div
                className={`absoluteright-0 left-0 mx-auto flex items-center justify-start gap-2 w-fit bg-green-200 rounded-full px-3 py-1 ${
                  statusMessage && statusType === "success"
                    ? "opacity-100 tranlate-y-0"
                    : "opacity-0 translate-y-5"
                } transition-all duration-300`}
              >
                <CircleCheck className="w-4 h-4 text-green-500" />
                <p className="text-xs text-green-500">
                  Settings saved successfully
                </p>
              </div>

              {/* Error */}
              <div
                className={`absolute right-0 left-0 mx-auto flex items-center justify-start gap-2 w-fit bg-red-200 rounded-full px-3 py-1 ${
                  statusMessage && statusType === "error"
                    ? "opacity-100 tranlate-y-0"
                    : "opacity-0 translate-y-5"
                } transition-all duration-300`}
              >
                <CircleX className="w-4 h-4 text-red-500" />
                <p className="text-xs text-red-500">{statusMessage}</p>
              </div>

              {/* Info */}
              <div
                className={`absolute right-0 left-0 mx-auto flex items-center justify-start gap-2 w-fit bg-blue-200 rounded-full px-3 py-1 ${
                  statusMessage && statusType === "info"
                    ? "opacity-100 tranlate-y-0"
                    : "opacity-0 translate-y-5"
                } transition-all duration-300`}
              >
                <Info className="w-4 h-4 text-blue-500" />
                <p className="text-xs text-blue-500">{statusMessage}</p>
              </div>
            </div>
          </>
        )}
        {activeTab === "analytics" && mounted && (
          <div className="p-6 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Analytics
                </h2>
              </div>
              <div className="flex items-center justify-center">
                <div className="rounded-l-md border border-gray-300 border-r-0 px-2 h-9 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-gray-500" />
                </div>
                <Select
                  defaultValue="7"
                  onValueChange={(value) =>
                    setChartDays(parseInt(value) as 7 | 14 | 30)
                  }
                >
                  <SelectTrigger className="rounded-l-none shadow-none w-32 hover:bg-gray-50 cursor-pointer transition-all duration-300">
                    <SelectValue placeholder="Select a date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-6 w-full">
             
            </div>

            {/* separator */}
            <div className="w-full h-px bg-gray-200 my-6" />

            {/* hidden jobs over time */}
            <Card className="w-full border-none shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Hidden Jobs Over Time
                    </CardTitle>
                    <CardDescription>
                      Total positions hidden in the last {chartDays} days
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 min-w-0">
                {chartData.length > 0 ? (
                  <div
                    style={{
                      width: "100%",
                      height: "300px",
                      minWidth: 0,
                      minHeight: "300px",
                    }}
                  >
                    <ChartContainer
                      key={`hidden-time-${activeTab}-${chartDays}`}
                      config={{
                        hidden: {
                          label: "Jobs",
                          color: "#133cff",
                        },
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        height: "300px",
                      }}
                    >
                      <AreaChart
                        accessibilityLayer
                        data={chartData}
                        margin={{
                          left: 12,
                          right: 12,
                        }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              labelFormatter={(value: string) => {
                                return new Date(value).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  }
                                );
                              }}
                              indicator="dot"
                            />
                          }
                        />
                        <Area
                          dataKey="hidden"
                          type="linear"
                          stroke="#133cff"
                          strokeWidth={2}
                          dot={false}
                          fill="#133cff"
                          fillOpacity={0.1}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    <p className="text-sm">
                      No data available for the selected period
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* separator */}
            <div className="w-full h-px bg-gray-200 my-6" />

            <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4 mt-6">
              {/* First column - Bar chart for most frequent banned words */}
              <div className="col-span-1">
                <Card className="shadow-none border-none w-full">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Most Frequent Words
                    </CardTitle>
                    <CardDescription>
                      Top banned words that triggered filters
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {bannedWordsData.length > 0 ? (
                      <div
                        style={{
                          width: "100%",
                          height: "200px",
                          minWidth: 0,
                          minHeight: "200px",
                        }}
                      >
                        <ChartContainer
                          key={`banned-words-${activeTab}-${chartDays}`}
                          config={{
                            count: {
                              label: "Count",
                              color: "#133cff",
                            },
                            label: {
                              color: "var(--background)",
                            },
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            height: "200px",
                          }}
                        >
                          <BarChart
                            accessibilityLayer
                            data={bannedWordsData}
                            layout="vertical"
                            margin={{
                              right: 50,
                              left: 8,
                              top: 8,
                              bottom: 8,
                            }}
                          >
                            <CartesianGrid horizontal={false} />
                            <YAxis
                              dataKey="word"
                              type="category"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              hide
                            />
                            <XAxis dataKey="count" type="number" hide />
                            <ChartTooltip
                              cursor={false}
                              content={
                                <ChartTooltipContent
                                  indicator="line"
                                  className="capitalize"
                                />
                              }
                            />
                            <Bar
                              dataKey="count"
                              fill="var(--color-count)"
                              radius={4}
                            >
                              <LabelList
                                dataKey="word"
                                position="insideLeft"
                                offset={8}
                                className="fill-(--color-label) capitalize"
                                fontSize={12}
                              />
                              <LabelList
                                dataKey="count"
                                position="right"
                                offset={8}
                                className="fill-foreground"
                                fontSize={12}
                              />
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-gray-500">
                        <p className="text-sm">
                          No banned words data available
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Second column - Pie chart for promoted vs banned words */}
              <div className="col-span-1">
                <Card className="shadow-none border-none w-full">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Hidden Jobs Breakdown
                    </CardTitle>
                    <CardDescription>Promoted, Words, and Companies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {pieChartData.length > 0 &&
                    pieChartData.some((item) => item.count > 0) ? (
                      <div
                        style={{
                          width: "100%",
                          height: "200px",
                          minWidth: 0,
                          minHeight: "200px",
                        }}
                      >
                        <ChartContainer
                          config={{
                            promoted: {
                              label: "Promoted",
                              color: "#133cff",
                            },
                            banned_words: {
                              label: "Words",
                              color: "#8ec5ff",
                            },
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            height: "200px",
                          }}
                        >
                          <PieChart>
                            <ChartTooltip
                              content={
                                <ChartTooltipContent
                                  nameKey="reason"
                                  hideLabel
                                />
                              }
                            />
                            <Pie
                              data={pieChartData}
                              dataKey="count"
                              labelLine={false}
                              label={({ payload, ...props }) => {
                                if (payload.count === 0) return null;
                                return (
                                  <text
                                    cx={props.cx}
                                    cy={props.cy}
                                    x={props.x}
                                    y={props.y}
                                    textAnchor={props.textAnchor}
                                    dominantBaseline={props.dominantBaseline}
                                    fill="hsla(var(--foreground))"
                                    fontSize={12}
                                    fontWeight={500}
                                  >
                                    {payload.count}
                                  </text>
                                );
                              }}
                              nameKey="reason"
                            />
                          </PieChart>
                        </ChartContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-gray-500">
                        <p className="text-sm">No data available</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
