require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cron = require("node-cron");
const axios = require("axios");
const dns = require("dns").promises;
const ping = require("ping");
const sslChecker = require("ssl-checker");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  getAllMonitors,
  addMonitor,
  addUser,
  getUser,
  deleteMonitor,
  updateMonitorStatus,
  getUptimePercentage,
  getUptimeChartData,
  getResponseTimeChartData,
  getMonitorHistory,
  updateMonitor,
  toggleMonitorPause,
  getMonitorUptimeChartData,
  getMonitorResponseTimeChartData,
  updateMonitorFavicon,
  getMonitorsForUser,
  getAllUsers,
  approveUser,
  rejectUser,
  updateMonitorSSL,
} = require("./database");
const cookieParser = require("cookie-parser");
const { authenticateJWT } = require("./common/context");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

async function fetchFavicon(url) {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    const html = response.data;

    if (!html || typeof html !== "string") {
      return null;
    }

    const iconMatch = html.match(
      /<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["'][^>]*>/i
    );
    if (iconMatch) {
      const iconUrl = iconMatch[1];
      if (iconUrl.startsWith("//")) {
        return "https:" + iconUrl;
      } else if (iconUrl.startsWith("/")) {
        const baseUrl = new URL(url);
        return `${baseUrl.protocol}//${baseUrl.host}${iconUrl}`;
      } else if (!iconUrl.startsWith("http")) {
        const baseUrl = new URL(url);
        return `${baseUrl.protocol}//${baseUrl.host}/${iconUrl}`;
      }
      return iconUrl;
    }
    const baseUrl = new URL(url);
    const faviconUrl = `${baseUrl.protocol}//${baseUrl.host}/favicon.ico`;
    try {
      await axios.head(faviconUrl, { timeout: 2000 });
      return faviconUrl;
    } catch {
      return null;
    }
  } catch (error) {
    console.error(`Error fetching favicon for ${url}:`, error.message);
    return null;
  }
}

app.get("/api/monitors", authenticateJWT, (req, res) => {
  console.log("Fetching monitors for user:", req.user);
  const role = req.user?.role || "user";
  const userId = req.user?.id;

  getMonitorsForUser(role, userId, (err, rows) => {
    if (err) {
      console.error("Error fetching monitors:", err.message);
      return res.status(500).json({ error: "Failed to fetch monitors" });
    }
    const monitorsWithType = rows.map((monitor) => ({
      ...monitor,
      type: monitor.type || "http",
      favicon: monitor.favicon || null,
      sslCertificate: monitor.ssl_info ? JSON.parse(monitor.ssl_info) : null,
    }));
    res.json(monitorsWithType);
  });
});

app.post("/api/monitors", authenticateJWT, async (req, res) => {
  let { name, url, type } = req.body;
  if (!name || !url || !type) {
    return res.status(400).json({ error: "Name, URL and Type are required" });
  }

  // Auto-detect type from URL only if the user selected http (or didn't select type)
  console.log(
    `[DEBUG] Received addMonitor request. Name: ${name}, URL: ${url}, Type: ${type}`
  );

  // if (type == "http") {
  //   if (url.toLowerCase().startsWith("https://")) {
  //     type = "https";
  //     console.log(`[DEBUG] Auto-detected type changed to: ${type}`);
  //   }
  // }

  // Get the authenticated user's ID from JWT token
  const createdBy = req.user ? req.user.id : null;
  console.log(`[DEBUG] Calling addMonitor with Type: ${type}`);

  addMonitor(name, url, type, createdBy, (err, id) => {
    if (err) {
      console.error("[DEBUG] Error in addMonitor callback:", err.message);
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({
          error: `A monitor with this URL and type (${type}) already exists`,
        });
      }
      return res.status(500).json({ error: "Failed to add monitor" });
    }

    if (type == "http") {
      fetchFavicon(url)
        .then((favicon) => {
          if (favicon) {
            updateMonitorFavicon(id, favicon, (updateErr) => {
              if (updateErr) {
                console.error("Error updating favicon:", updateErr.message);
              }
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching favicon:", err.message);
        });

      if (url.toLowerCase().startsWith("https://")) {
        console.log("[DEBUG] Triggering SSL check for new HTTPS monitor");
        checkSSL({ id, url, type });
      }
    }

    res.status(201).json({
      id,
      name,
      url,
      type: type || "http",
      status: "unknown",
      response_time: 0,
      paused: 0,
      favicon: null,
      message: "Monitor added successfully",
    });
  });
});

app.delete("/api/monitors/:id", (req, res) => {
  const { id } = req.params;
  deleteMonitor(id, (err) => {
    if (err) {
      console.error("Error deleting monitor:", err.message);
      return res.status(500).json({ error: "Failed to delete monitor" });
    }
    res.json({ message: "Monitor deleted successfully" });
  });
});

app.get("/api/monitors/:id/uptime", (req, res) => {
  const { id } = req.params;
  getUptimePercentage(id, (err, percentage) => {
    if (err) {
      console.error("Error fetching uptime:", err.message);
      return res.status(500).json({ error: "Failed to fetch uptime" });
    }
    res.json({ uptime: percentage });
  });
});

app.get("/api/charts/uptime", (req, res) => {
  getUptimeChartData((err, data) => {
    if (err) {
      console.error("Error fetching uptime chart data:", err.message);
      return res.status(500).json({ error: "Failed to fetch uptime data" });
    }
    res.json(data || []);
  });
});

app.get("/api/charts/response-time", (req, res) => {
  getResponseTimeChartData((err, data) => {
    if (err) {
      console.error("Error fetching response time data:", err.message);
      return res
        .status(500)
        .json({ error: "Failed to fetch response time data" });
    }
    res.json(data || []);
  });
});

app.put("/api/monitors/:id", (req, res) => {
  const { id } = req.params;
  const { name, url, type = "http" } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: "Name and URL are required" });
  }
  updateMonitor(id, name, url, type, (err) => {
    if (err) {
      console.error("Error updating monitor:", err.message);
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        return res
          .status(400)
          .json({ error: "A monitor with this URL and type already exists" });
      }
      return res.status(500).json({ error: "Failed to update monitor" });
    }
    res.json({ message: "Monitor updated successfully" });

    // Trigger checks if updated
    if (url.toLowerCase().startsWith("https://")) {
      checkSSL({ id, url, type });
    }
  });
});

app.patch("/api/monitors/:id/pause", (req, res) => {
  const { id } = req.params;
  const { paused } = req.body;
  toggleMonitorPause(id, paused, (err) => {
    if (err) {
      console.error("Error updating pause status:", err.message);
      return res.status(500).json({ error: "Failed to update pause status" });
    }
    res.json({
      paused,
      message: paused ? "Monitoring paused" : "Monitoring resumed",
    });
  });
});

app.get("/api/monitors/:id/history", (req, res) => {
  const { id } = req.params;
  getMonitorHistory(id, (err, data) => {
    if (err) {
      console.error("Error fetching monitor history:", err.message);
      return res.status(500).json({ error: "Failed to fetch history" });
    }
    res.json(data || []);
  });
});

app.get("/api/monitors/:id/chart/uptime", (req, res) => {
  const { id } = req.params;
  getMonitorUptimeChartData(id, (err, data) => {
    if (err) {
      console.error("Error fetching monitor uptime chart data:", err.message);
      return res.status(500).json({ error: "Failed to fetch uptime data" });
    }
    res.json(data || []);
  });
});

app.get("/api/monitors/:id/chart/response-time", (req, res) => {
  const { id } = req.params;
  getMonitorResponseTimeChartData(id, (err, data) => {
    if (err) {
      console.error("Error fetching monitor response time data:", err.message);
      return res
        .status(500)
        .json({ error: "Failed to fetch response time data" });
    }
    res.json(data || []);
  });
});

// Check DNS resolution
async function checkDns(monitor) {
  const start = Date.now();
  try {
    // Extract hostname from URL
    let hostname = monitor.url;
    if (hostname.startsWith("http://") || hostname.startsWith("https://")) {
      hostname = new URL(monitor.url).hostname;
    }

    await dns.resolve4(hostname);
    const responseTime = Date.now() - start;

    let status = "down";
    if (responseTime < 1000) {
      status = "up";
    } else if (responseTime < 5000) {
      status = "slow";
    } else {
      status = "down";
    }

    updateMonitorStatus(monitor.id, status, responseTime, null, (err) => {
      if (err) {
        console.error(`Error updating DNS monitor ${monitor.id}:`, err.message);
      }
    });
  } catch (error) {
    const responseTime = Date.now() - start;
    const errorMessage = error.message || "DNS resolution failed";
    updateMonitorStatus(
      monitor.id,
      "down",
      responseTime,
      errorMessage,
      (err) => {
        if (err) {
          console.error(
            `Error updating DNS monitor ${monitor.id}:`,
            err.message
          );
        }
      }
    );
  }
}

// Check ICMP ping
async function checkPing(monitor) {
  const start = Date.now();
  try {
    let hostname = monitor.url;
    if (hostname.startsWith("http://") || hostname.startsWith("https://")) {
      hostname = new URL(monitor.url).hostname;
    }

    const result = await ping.promise.probe(hostname, {
      timeout: 2,
    });

    const responseTime = Date.now() - start;

    let status = "down";
    if (result.alive) {
      const pingTime =
        typeof result.time === "number" ? result.time : responseTime;
      if (pingTime < 1000) {
        status = "up";
      } else if (pingTime < 5000) {
        status = "slow";
      } else {
        status = "down";
      }
    }

    updateMonitorStatus(monitor.id, status, responseTime, null, (err) => {
      if (err) {
        console.error(
          `Error updating PING monitor ${monitor.id}:`,
          err.message
        );
      }
    });
  } catch (error) {
    const responseTime = Date.now() - start;
    const errorMessage = error.message || "Ping failed";
    updateMonitorStatus(
      monitor.id,
      "down",
      responseTime,
      errorMessage,
      (err) => {
        if (err) {
          console.error(
            `Error updating PING monitor ${monitor.id}:`,
            err.message
          );
        }
      }
    );
  }
}

// Check monitor status
async function checkUptime(monitor) {
  const start = Date.now();
  try {
    const response = await axios.get(monitor.url, { timeout: 10000 });
    const responseTime = Date.now() - start;

    let status = "down";
    if (response.status === 200) {
      if (responseTime < 1000) {
        status = "up";
      } else if (responseTime < 5000) {
        status = "slow";
      } else {
        status = "down";
      }
    }

    updateMonitorStatus(monitor.id, status, responseTime, null, (err) => {
      if (err) {
        console.error(`Error updating monitor ${monitor.id}:`, err.message);
      }
    });
  } catch (error) {
    const responseTime = Date.now() - start;
    const errorMessage =
      error.response?.statusText || error.message || "Unknown error";
    updateMonitorStatus(
      monitor.id,
      "down",
      responseTime,
      errorMessage,
      (err) => {
        if (err) {
          console.error(`Error updating monitor ${monitor.id}:`, err.message);
        }
      }
    );
  }
}

async function checkSSL(monitor) {
  try {
    let hostname = monitor.url;
    if (hostname.startsWith("http://") || hostname.startsWith("https://")) {
      hostname = new URL(monitor.url).hostname;
    }

    const sslDetails = await sslChecker(hostname);

    // Transform to match frontend expectations
    const mappedSSL = {
      daysRemaining: sslDetails.daysRemaining,
      valid: sslDetails.valid,
      issuer:
        typeof sslDetails.issuer === "object"
          ? sslDetails.issuer.O || sslDetails.issuer.CN
          : sslDetails.issuer,
      domain: hostname,
      issuedDate: sslDetails.validFrom,
      expirationDate: sslDetails.validTo,
      autoRenewal: false,
    };

    updateMonitorSSL(monitor.id, mappedSSL, (err) => {
      if (err)
        console.error(
          `Error updating SSL for monitor ${monitor.id}:`,
          err.message
        );
    });
  } catch (error) {
    console.error(`SSL check failed for monitor ${monitor.id}:`, error.message);
    // Optionally update with error state or null
  }
}

// Check SSL every 12 hours
cron.schedule("0 */12 * * *", () => {
  console.log("Running SSL checks...");
  getAllMonitors((err, monitors) => {
    if (err) return;
    monitors.forEach((monitor) => {
      if (!monitor.paused && monitor.url.toLowerCase().startsWith("https://")) {
        checkSSL(monitor);
      }
    });
  });
});

// Run checks every minute
cron.schedule("* * * * *", () => {
  console.log("Running uptime checks...");
  getAllMonitors((err, monitors) => {
    if (err) {
      console.error("Error fetching monitors for check:", err.message);
      return;
    }
    monitors.forEach((monitor) => {
      if (!monitor.paused) {
        if (monitor.type === "dns") {
          checkDns(monitor);
        } else if (monitor.type === "icmp") {
          checkPing(monitor);
        } else {
          checkUptime(monitor);
        }
      }
    });
  });
});

app.get("/api/monitors/:id/downtime", (req, res) => {
  const { id } = req.params;
  getMonitorHistory(id, (err, history) => {
    if (err) {
      console.error("Error fetching monitor history:", err.message);
      return res.status(500).json({ error: "Failed to fetch history" });
    }

    if (!history || history.length === 0) {
      return res.json({ downtimes: [], message: "No history available" });
    }

    const sortedHistory = [...history].reverse();
    const downtimes = [];
    let currentDownStart = null;

    for (let i = 0; i < sortedHistory.length; i++) {
      const entry = sortedHistory[i];
      if (entry.status === "down") {
        if (!currentDownStart) {
          currentDownStart = entry.checked_at;
        }
      } else if (
        (entry.status === "up" || entry.status === "slow") &&
        currentDownStart
      ) {
        const downEnd = entry.checked_at;
        const duration = new Date(downEnd) - new Date(currentDownStart);
        downtimes.push({
          start: currentDownStart,
          end: downEnd,
          duration: Math.floor(duration / 1000),
        });
        currentDownStart = null;
      }
    }

    const recentDowntimes = downtimes.reverse().slice(0, 30);
    res.json({
      downtimes: recentDowntimes,
      total: downtimes.length,
    });
  });
});

app.listen(PORT, () => {
  console.log(`UptimeKit backend server running on port ${PORT}`);
});

app.post("/api/signup", async (req, res) => {
  const { name, loginId, password, email } = req.body;
  if (!loginId || !password || !email) {
    return res.status(400).json({ error: "loginId and password are required" });
  }

  const passenc = bcrypt.hashSync(password, 10);

  addUser(name, loginId, passenc, email, (err, id) => {
    if (err) {
      console.error("Error adding user:", err.message);
      if (err.message && err.message.includes("UNIQUE constraint failed")) {
        return res
          .status(400)
          .json({ error: "A user with this LOGINID and EMAIL already exists" });
      }
      return res.status(500).json({ error: "Failed to add user" });
    }

    res.status(201).json({
      id,
      name,
      loginId,
      password,
      email,
      message: "User added successfully",
    });
  });
});

app.post("/api/login", async (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) {
    return res.status(400).json({ error: "loginId and password are required" });
  }

  getUser(loginId, (err, user) => {
    if (err) {
      console.error("Error fetching user:", err.message);
      return res.status(500).json({ error: "Failed to fetch user" });
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.status === "PENDING") {
      return res
        .status(403)
        .json({ error: "Your account is pending approval" });
    }

    if (user.status === "REJECTED") {
      return res.status(403).json({ error: "Your account has been rejected" });
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        loginId: user.login_id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: false, // Prod дээр true
      sameSite: "lax",
      path: "/",
    };
    res.cookie("access_token", token, cookieOptions);

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        loginId: user.login_id,
        email: user.email,
      },
    });
  });
});

app.get("/api/me", authenticateJWT, (req, res) => {
  res.json({
    user: req.user,
  });
});

app.post("/api/logout", (req, res) => {
  res.clearCookie("access_token");
  res.status(200).json({ message: "Logged out successfully" });
});

app.get("/api/users", authenticateJWT, (req, res) => {
  console.log("Fetching users");
  //const role = req.user?.role || "user";
  //const userId = req.user?.id;

  getAllUsers((err, rows) => {
    if (err) {
      console.error("Error fetching users:", err.message);
      return res.status(500).json({ error: "Failed to fetch monitors" });
    }
    res.status(200).json(rows || []);
  });
});

app.post("/api/approve/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  approveUser(id, (err) => {
    if (err) {
      console.error("Error approving user:", err.message);
      return res.status(500).json({ error: "Failed to approve user" });
    }

    res.status(201).json({
      id,
      message: "User approved successfully",
    });
  });
});

app.post("/api/reject/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "id is required" });
  }

  rejectUser(id, (err) => {
    if (err) {
      console.error("Error rejecting user:", err.message);
      return res.status(500).json({ error: "Failed to reject user" });
    }

    res.status(201).json({
      id,
      message: "User rejected successfully",
    });
  });
});
