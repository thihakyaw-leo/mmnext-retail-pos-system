import { AppError, ValidationError } from '../utils/errorHandler.js';

export class ConnectionManager {
    private readonly sessions: Map<string, {
        sessionId: string;
        userId: string;
        organizationId: string;
        socket: WebSocket;
        ipAddress?: string;
        lastSeen: Date;
    }> = new Map();

    private readonly userSessions: Map<string, string[]> = new Map();

    /**
     * Track user sessions for quick lookups
     */
    trackSession(sessionToken: string, userId: string, organizationId: string, socket: WebSocket, ipAddress?: string) {
        const sessionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        this.sessions.set(sessionId, {
            sessionId,
            userId,
            organizationId,
            socket,
            ipAddress,
            lastSeen: new Date()
        });

        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, []);
        }
        this.userSessions.get(userId)!.push(sessionId);

        return sessionId;
    }

    /**
     * Get active sessions for a user
     */
    getUserSessions(userId: string) {
        return this.userSessions.get(userId) || [];
    }

    /**
     * Get session by ID
     */
    getSession(sessionId: string) {
        return this.sessions.get(sessionId);
    }

    /**
     * Get all active sessions
     */
    getAllSessions() {
        return Array.from(this.sessions.values());
    }

    /**
     * Get all sessions for an organization
     */
    getOrganizationSessions(organizationId: string) {
        return Array.from(this.sessions.values()).filter(
            session => session.organizationId === organizationId
        );
    }

    /**
     * Send message to a specific session
     */
    async sendMessage(sessionId: string, message: any) {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        if (session.socket.readyState === WebSocket.OPEN) {
            session.socket.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    /**
     * Broadcast message to all sessions of an organization
     */
    async broadcastToOrganization(organizationId: string, message: any) {
        const sessions = this.getOrganizationSessions(organizationId);
        let successCount = 0;

        sessions.forEach(session => {
            if (session.socket.readyState === WebSocket.OPEN) {
                try {
                    session.socket.send(JSON.stringify(message));
                    successCount++;
                } catch (error) {
                    // Socket might have closed between check and send
                    console.warn(`Failed to send to session ${session.userId}:`, error);
                    this.removeSession(session.userId, session.sessionId);
                }
            }
        });

        return successCount;
    }

    /**
     * Broadcast message to all sessions except a specific one
     */
    async broadcastExcludingSession(excludeSessionId: string, message: any) {
        const sessions = Array.from(this.sessions.values());
        let successCount = 0;

        sessions.forEach(session => {
            if (session.sessionId !== excludeSessionId && session.socket.readyState === WebSocket.OPEN) {
                try {
                    session.socket.send(JSON.stringify(message));
                    successCount++;
                } catch (error) {
                    console.warn(`Failed to send to session ${session.userId}:`, error);
                    this.removeSession(session.userId, excludeSessionId);
                }
            }
        });

        return successCount;
    }

    /**
     * Remove session on close
     */
    removeSession(userId: string, sessionId: string) {
        this.sessions.delete(sessionId);

        const userSessions = this.userSessions.get(userId);
        if (userSessions) {
            const index = userSessions.indexOf(sessionId);
            if (index !== -1) {
                userSessions.splice(index, 1);
            }
            if (userSessions.length === 0) {
                this.userSessions.delete(userId);
            }
        }
    }

    /**
     * Handle WebSocket close event
     */
    handleClose(userId: string, sessionId: string, reason?: string) {
        this.removeSession(userId, sessionId);
        console.log(`Session closed: ${sessionId}`, reason ? `- ${reason}` : '');

        return {
            success: true,
            message: 'Session closed successfully',
            remainingSessions: this.userSessions.get(userId)?.length || 0
        };
    }

    /**
     * Handle WebSocket error
     */
    handleError(userId: string, sessionId: string, error: Error) {
        console.error(`WebSocket error for session ${sessionId}:`, error);
        this.removeSession(userId, sessionId);

        return {
            success: false,
            message: 'WebSocket error',
            error: error.message,
            remainingSessions: this.userSessions.get(userId)?.length || 0
        };
    }

    /**
     * Validate session before allowing operations
     */
    validateSession(userId: string, sessionId?: string) {
        if (!sessionId) {
            throw new ValidationError('Session ID is required');
        }

        const session = this.getSession(sessionId);
        if (!session) {
            throw new ValidationError('Session not found');
        }

        if (session.userId !== userId) {
            throw new AppError('Unauthorized - Invalid session', 'UNAUTHORIZED', 403);
        }

        // Update last seen
        session.lastSeen = new Date();

        return {
            valid: true,
            session
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        // Close all WebSocket connections
        Array.from(this.sessions.values()).forEach(session => {
            try {
                if (session.socket.readyState === WebSocket.OPEN) {
                    session.socket.close();
                }
            } catch (error) {
                // Ignore errors during shutdown
            }
        });

        this.sessions.clear();
        this.userSessions.clear();

        return {
            message: 'Connection manager shut down gracefully',
            activeSessions: 0
        };
    }
}
