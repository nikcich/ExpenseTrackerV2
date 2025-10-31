use uuid::Uuid;

pub fn generate_uuid() -> String {
    return Uuid::new_v4().to_string();
}
