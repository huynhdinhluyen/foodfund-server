# 🎖️ Badge Query Examples

## 📋 **Available Queries in User Service**

### **1. Get My Profile (with Badge)**

```graphql
query {
  getMyProfile {
    message
    userProfile {
      id
      full_name
      email
      role
      badge {  # ← Field resolver tự động fetch
        name
        description
        icon_url
        sort_order
      }
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "getMyProfile": {
      "message": "Profile for donor user",
      "userProfile": {
        "id": "user-123",
        "full_name": "Nguyễn Văn A",
        "email": "user@example.com",
        "role": "DONOR",
        "badge": {
          "name": "Nhà Hảo Tâm Vàng",
          "description": "Đã quyên góp trên 10 triệu đồng",
          "icon_url": "https://cdn.example.com/gold.png",
          "sort_order": 4
        }
      }
    }
  }
}
```

---

### **2. Get My Profile (Non-DONOR - No Badge)**

```graphql
query {
  getMyProfile {
    userProfile {
      id
      full_name
      role
      badge {
        name
      }
    }
  }
}
```

**Response (Fundraiser/Admin/Staff):**
```json
{
  "data": {
    "getMyProfile": {
      "userProfile": {
        "id": "user-456",
        "full_name": "Trần Thị B",
        "role": "FUNDRAISER",
        "badge": null  // ← Non-DONOR không có badge
      }
    }
  }
}
```

---

### **3. Get All Badges (Public)**

```graphql
query {
  badges {
    id
    name
    description
    icon_url
    sort_order
    is_active
  }
}
```

**Response:**
```json
{
  "data": {
    "badges": [
      {
        "id": "badge-1",
        "name": "Quyên Góp Đầu Tiên",
        "description": "Cảm ơn bạn đã quyên góp lần đầu!",
        "icon_url": "https://cdn.example.com/first.png",
        "sort_order": 1,
        "is_active": true
      },
      {
        "id": "badge-2",
        "name": "Nhà Hảo Tâm Đồng",
        "description": "Đã quyên góp trên 100 nghìn đồng",
        "icon_url": "https://cdn.example.com/bronze.png",
        "sort_order": 2,
        "is_active": true
      }
    ]
  }
}
```

---

### **4. Get My Badge**

```graphql
query {
  myBadge {
    id
    badge {
      name
      description
      icon_url
    }
    awarded_at
  }
}
```

**Response:**
```json
{
  "data": {
    "myBadge": {
      "id": "user-badge-123",
      "badge": {
        "name": "Nhà Hảo Tâm Bạc",
        "description": "Đã quyên góp trên 1 triệu đồng",
        "icon_url": "https://cdn.example.com/silver.png"
      },
      "awarded_at": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

### **5. Get Specific Badge**

```graphql
query {
  badge(id: "badge-id-here") {
    id
    name
    description
    icon_url
    sort_order
    created_at
  }
}
```

---

## 🎯 **Use Cases**

### **Use Case 1: Display Badge in User Profile**

```typescript
// Frontend component
function UserProfile() {
  const { data } = useQuery(GET_MY_PROFILE)
  
  return (
    <div>
      <h1>{data.getMyProfile.userProfile.full_name}</h1>
      <p>Role: {data.getMyProfile.userProfile.role}</p>
      
      {data.getMyProfile.userProfile.badge && (
        <div className="badge">
          <img src={data.getMyProfile.userProfile.badge.icon_url} />
          <span>{data.getMyProfile.userProfile.badge.name}</span>
        </div>
      )}
    </div>
  )
}
```

---

### **Use Case 2: Badge Gallery Page**

```typescript
function BadgeGallery() {
  const { data } = useQuery(GET_ALL_BADGES)
  const { data: myBadge } = useQuery(GET_MY_BADGE)
  
  return (
    <div className="badge-gallery">
      <h2>Badge Collection</h2>
      {data.badges.map(badge => (
        <BadgeCard 
          key={badge.id}
          badge={badge}
          earned={myBadge?.badge?.id === badge.id}
        />
      ))}
    </div>
  )
}
```

---

### **Use Case 3: Badge Progress Indicator**

```typescript
function BadgeProgress() {
  const { data } = useQuery(GET_ALL_BADGES)
  const { data: profile } = useQuery(GET_MY_PROFILE)
  
  const currentBadge = profile.getMyProfile.userProfile.badge
  const currentIndex = data.badges.findIndex(b => b.id === currentBadge?.id)
  
  return (
    <div className="progress">
      {data.badges.map((badge, index) => (
        <div 
          key={badge.id}
          className={index <= currentIndex ? 'achieved' : 'locked'}
        >
          <img src={badge.icon_url} />
          <span>{badge.name}</span>
        </div>
      ))}
    </div>
  )
}
```

---

## 📝 **GraphQL Queries (Copy-Paste Ready)**

```graphql
# Query 1: Get my profile with badge
query GetMyProfile {
  getMyProfile {
    message
    userProfile {
      id
      full_name
      email
      role
      badge {
        name
        description
        icon_url
        sort_order
      }
    }
  }
}

# Query 2: Get all badges
query GetAllBadges {
  badges {
    id
    name
    description
    icon_url
    sort_order
    is_active
  }
}

# Query 3: Get my badge
query GetMyBadge {
  myBadge {
    id
    badge {
      name
      description
      icon_url
    }
    awarded_at
  }
}

# Query 4: Get specific badge
query GetBadge($id: String!) {
  badge(id: $id) {
    id
    name
    description
    icon_url
    sort_order
    is_active
    created_at
    updated_at
  }
}
```

---

## ✅ **Summary**

**Available Queries:**
1. ✅ `getMyProfile` - Get current user profile (badge auto-resolved)
2. ✅ `badges` - Get all active badges
3. ✅ `badge(id)` - Get specific badge
4. ✅ `myBadge` - Get current user's badge

**Field Resolver:**
- ✅ `UserProfileSchema.badge` - Auto-resolve badge for DONOR users

**Note:** Không có query `me` hay `users` - dùng `getMyProfile` thay thế!
