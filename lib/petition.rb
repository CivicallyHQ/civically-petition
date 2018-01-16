class CivicallyPetition::Petition
  def self.resolutions
    @resolutions ||= []
  end

  def self.add_resolution(type, &block)
    resolutions << { type: type, block: block }
  end

  def self.resolve(topic, forced)
    resolution = @resolutions.select { |r| r[:type] === topic.petition_type }.first
    if resolution && resolution[:block]
      resolution[:block].call(topic, forced)
    else
      false
    end
  end
end
