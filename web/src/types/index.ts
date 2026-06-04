export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_admin: boolean;           // ← 추가
  profile_image?: string | null;
  status_message?: string;
  created_at?: string;
}
export interface TokenResponse { access_token: string; token_type: string; user: User; }

export interface ChatRoom {
  id: number; title: string;
  persona_id: string; persona_prompt: string; web_search_enabled: boolean;
  created_at: string;
}
export interface ChatMessage {
  id: number; role: 'user' | 'assistant'; content: string;
  sources?: Source[]; web_sources?: WebSource[]; created_at?: string;
}
export interface Source { filename: string; chunk_index: string; score: number; }
export interface WebSource { title: string; url: string; }
export interface Document { id: number; filename: string; file_type: string; chunk_count: number; created_at: string; }
export interface Persona { id: string; name: string; description: string; emoji: string; }

export interface FriendUser { id: number; username: string; email: string; friendship_id?: number; friend_status?: 'none' | 'friends' | 'sent' | 'received'; profile_image?: string | null; status_message?: string; is_online?: boolean; }
export interface FriendRequest { friendship_id: number; id: number; username: string; email: string; profile_image?: string | null; }
export interface UserChatRoom { id: number; name: string; description?: string; member_count: number; online_count: number; is_member: boolean; unread_count?: number; last_message?: { content: string; username: string; created_at: string } | null; created_at: string; }
export interface Reaction { emoji: string; count: number; }
export interface ReplyTo { id: number; username: string; content: string; message_type: string; }
export interface UserMessage { id: number; user_id: number; username: string; profile_image?: string | null; content: string; message_type: 'text' | 'file' | 'system'; file?: SharedFile; created_at: string; read_count?: number; readers_needed?: number; is_read?: boolean; is_deleted?: boolean; edited_at?: string | null; reactions?: Reaction[]; my_reactions?: string[]; reply_to?: ReplyTo | null; }
export interface SharedFile { id: number; filename: string; file_size: string; file_type: string; }
export interface RoomMember { id: number; username: string; is_online: boolean; profile_image?: string | null; status_message?: string; }
export interface UserProfile { id: number; email: string; username: string; status_message: string; profile_image: string | null; is_active: boolean; is_online?: boolean; }
export interface ApiError { detail: string; }
